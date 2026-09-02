import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Send,
    User,
    X,
    Clock,
    Check,
    CheckCheck,
    Search,
    Calendar,
    CalendarDays,
    Paperclip,
    Info,
    Smile,
    RotateCcw,
    BarChart2,
    PlusCircle,
    Pin,
    Bookmark,
    Trash2,
    Forward,
    ChevronDown,
    ChevronUp,
    Grid,
    MoreHorizontal,
    Reply,
    Mic,
    StopCircle,
    X as XIcon,
    Video as VideoIcon,
    Shield,
    BadgeCheck,
    Code,
    Dumbbell,
    CornerUpLeft,
    Share,
    Flag,
    Image as ImageIcon,
    Sparkles,
    MessageCircle,
    Settings,
    Copy,
    Crown,
    MoreVertical,
    CornerUpRight,
    Users,
    ChevronRight,
    ChevronLeft,
    ArrowRight,
    Loader2,
    Plus,
    File as FileIcon,
    Download,
    UserMinus,
    Play,
    FileText,
    Camera,
    CheckSquare,
    Mail,
    Phone,
    History,
    Zap, Globe, Layout, MapPin, CheckCircle2, Trophy,
    Sun, Cloud, CloudRain, CloudLightning, Snowflake, Thermometer, Droplets,
    Megaphone, Pencil, UploadCloud
} from 'lucide-react';
import Lottie from 'lottie-react';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import { safeLocalStorage } from '../../utils/storage';
import { AnnouncementModal } from './AnnouncementModal';
import { ChatAttachmentMenu } from './ChatAttachmentMenu';
import { ChatProfileDrawer } from './ChatProfileDrawer';
import { MediaUploadTrayModal, MediaUploadItem } from './MediaUploadTrayModal';
import { SpartaMediaGalleryModal, GalleryMediaItem } from './SpartaMediaGalleryModal';
import { SpartaForwardModal } from './SpartaForwardModal';
import { SpartaScheduleChatCard } from './SpartaScheduleChatCard';
import { SpartaAvatar } from './SpartaAvatar';
import { SpartaDatePickerPopover } from './SpartaDatePickerPopover';
import { SpartaProgressiveImage } from './SpartaProgressiveImage';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    Timestamp,
    where,
    getDocs,
    getDoc,
    limit,
    deleteDoc,
    setDoc,
    documentId,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { SpartaEmojiPicker } from './SpartaEmojiPicker';
import { useChatMessages } from '../../hooks/useChatMessages';
import { VoicePlayer } from './VoicePlayer';

const VerificationBadge = ({ role, verification }: { role?: string, verification?: any }) => {
    if (!verification?.isVerified && !['admin', 'trainer', 'coach', 'developer'].includes(role?.toLowerCase() || '')) return null;

    const getBadgeConfig = () => {
        const r = role?.toLowerCase();
        if (r === 'system') return { icon: Sparkles, color: 'text-sparta-gold', bg: 'bg-sparta-gold/10', label: 'Система' };
        if (r === 'admin') return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Администратор' };
        if (r === 'trainer' || r === 'coach') return { icon: Dumbbell, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Тренер' };
        if (r === 'developer') return { icon: Code, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Разработчик' };
        if (verification?.isVerified) return { icon: BadgeCheck, color: 'text-blue-400', bg: 'bg-blue-400/10', label: verification.title || 'Верифицирован' };
        return null;
    };

    const config = getBadgeConfig();
    if (!config) return null;
    const Icon = config.icon;

    return (
        <div className="group relative inline-flex ml-1 align-middle">
            <Icon size={12} className={config.color} />

            {/* Popover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-surface-dark border border-card-border rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-[100] backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-lg ${config.bg} ${config.color} flex items-center justify-center`}>
                        <Icon size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{config.label}</span>
                </div>
                <p className="text-[9px] text-muted leading-relaxed uppercase font-bold tracking-tighter">
                    Официальный статус подтвержден администрацией Sparta Sports Center
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1a1a1a]" />
            </div>
        </div>
    );
};
import { format, parse, isAfter, subHours, addDays, startOfDay, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import MessageContextMenu from './MessageContextMenu';
import PollMessage from './PollMessage';
import CreatePollModal from './CreatePollModal';
import AudioRecorder from './AudioRecorder';
import { SpartaMessageReactionBadges, SPARTA_3D_REACTIONS } from './SpartaReactions';

interface GroupChatProps {
    user: any;
    userProfile: any;
    groupId?: string;
    groupName?: string;
    isUnifiedChat?: boolean;
    chatId?: string;
    onSelectChat?: (chat: any) => void;
    onStartPrivateChat?: (uid: string, name: string) => void;
    onBack?: () => void;
}

const WeatherModal = ({ isOpen, onClose, weatherData, locationName, onLocationChange, lastUpdated, onRefresh }: { isOpen: boolean, onClose: () => void, weatherData: any, locationName: string, onLocationChange: (lat: number, lon: number, name: string) => void, lastUpdated: Date | null, onRefresh: () => void }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    if (!isOpen || !weatherData) return null;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`);
            const data = await res.json();
            setSearchResults(data);
        } catch (e) {
            console.error("Search failed:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectLocation = (result: any) => {
        const name = result.display_name.split(',')[0];
        onLocationChange(parseFloat(result.lat), parseFloat(result.lon), name);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-surface-dark border border-card-border rounded-[32px] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-sparta-gold/10 blur-[100px] rounded-full shrink-0" />

                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h3 className="text-2xl font-russo text-white uppercase tracking-tight">Погодный центр</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <MapPin size={12} className="text-sparta-gold" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sparta-gold">{locationName}</span>
                            {lastUpdated && (
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest ml-2 flex items-center gap-1">
                                    <Clock size={8} /> {format(lastUpdated, 'HH:mm:ss')}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh();
                            }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/20 hover:text-sparta-gold transition-all"
                            title="Обновить данные"
                        >
                            <RotateCcw size={20} />
                        </button>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/20 hover:text-white transition-all">
                            <XIcon size={20} />
                        </button>
                    </div>
                </div>

                {/* City Search */}
                <div className="relative z-20 mb-8">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sparta-gold transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Найти город..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all placeholder:text-white/10"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 size={16} className="text-sparta-gold animate-spin" />
                            </div>
                        )}
                    </form>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-card-border rounded-2xl overflow-hidden divide-y divide-white/5 shadow-2xl z-30"
                            >
                                {searchResults.map((r, i) => (
                                    <button
                                        key={i}
                                        onClick={() => selectLocation(r)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all group text-left"
                                    >
                                        <div>
                                            <p className="text-xs text-white font-bold">{r.display_name.split(',')[0]}</p>
                                            <p className="text-[10px] text-muted truncate max-w-[300px]">{r.display_name}</p>
                                        </div>
                                        <Plus size={14} className="text-sparta-gold/50 group-hover:text-sparta-gold transition-colors" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-8">
                    {/* Current Weather Card */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center group/weather">
                        <div className="mb-4 group-hover:scale-110 transition-transform">
                            {(() => {
                                const code = weatherData.current_weather.weathercode;
                                if (code === 0) return <Sun size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />;
                                if (code <= 3) return <Cloud size={48} className="text-secondary" />;
                                if (code >= 51 && code <= 67) return <CloudRain size={48} className="text-blue-400" />;
                                if (code >= 71 && code <= 77) return <Snowflake size={48} className="text-cyan-200" />;
                                if (code >= 95) return <CloudLightning size={48} className="text-sparta-gold" />;
                                return <Cloud size={48} className="text-muted" />;
                            })()}
                        </div>
                        <p className="text-5xl font-russo text-white mb-2">{Math.round(weatherData.current_weather.temperature)}°C</p>
                        <a
                            href="https://open-meteo.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-sparta-gold transition-colors flex items-center gap-1"
                        >
                            <Shield size={10} /> Официальные данные • Open-Meteo
                        </a>
                    </div>

                    {/* Pro Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                            <Thermometer size={20} className="text-orange-400" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Ощущается</p>
                                <p className="text-sm font-bold text-white">{Math.round(weatherData.hourly.apparent_temperature[0])}°C</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                            <Droplets size={20} className="text-blue-300" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Влажность</p>
                                <p className="text-sm font-bold text-white">{weatherData.hourly.relative_humidity_2m[0]}%</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                            <Zap size={20} className="text-sparta-gold" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Ветер</p>
                                <p className="text-sm font-bold text-white">{weatherData.current_weather.windspeed} к/ч</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                            <CloudRain size={20} className="text-blue-400" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Осадки</p>
                                <p className="text-sm font-bold text-white">{weatherData.daily.precipitation_probability_max[0]}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 7-Day Forecast */}
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 ml-1">Недельный прогноз</h4>
                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        {weatherData.daily.time.map((date: string, i: number) => (
                            <div key={date} className="flex-shrink-0 w-20 bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-3 hover:bg-white/10 transition-all border-b-2 border-b-transparent hover:border-b-sparta-gold">
                                <p className="text-[9px] font-black uppercase text-muted">{i === 0 ? 'Сегодня' : format(new Date(date), 'eee', { locale: ru })}</p>
                                {(() => {
                                    const code = weatherData.daily.weathercode[i];
                                    if (code === 0) return <Sun size={18} className="text-yellow-400" />;
                                    if (code <= 3) return <Cloud size={18} className="text-secondary" />;
                                    if (code >= 51 && code <= 67) return <CloudRain size={18} className="text-blue-400" />;
                                    if (code >= 71 && code <= 77) return <Snowflake size={18} className="text-cyan-200" />;
                                    if (code >= 95) return <CloudLightning size={18} className="text-sparta-gold" />;
                                    return <Cloud size={18} className="text-muted" />;
                                })()}
                                <p className="text-xs font-bold text-white">{Math.round(weatherData.daily.temperature_2m_max[i])}°</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 p-4 bg-sparta-gold/5 border border-sparta-gold/10 rounded-2xl relative z-10 flex items-center gap-4 justify-between">
                    <p className="text-[11px] text-sparta-gold/60 font-medium leading-relaxed italic">
                        {weatherData.daily.precipitation_probability_max[0] > 50 ? '⚠️ Ожидаются осадки! Не забудьте ветровку. 🧥' : '✓ Погода идеальна для интенсивной тренировки! ⚽'}
                    </p>
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                        <span>Закат</span>
                        <span className="text-muted">{format(new Date(weatherData.daily.sunset[0]), 'HH:mm')}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const WeatherWidget = () => {
    const [weatherData, setWeatherData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [location, setLocation] = useState(() => {
        const saved = localStorage.getItem('sparta_weather_location');
        return saved ? JSON.parse(saved) : { lat: 55.7558, lon: 37.6173, name: 'Москва' };
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchWeather = async () => {
        setLoading(true);
        try {
            // Official Open-Meteo Pro parameters
            const params = [
                `latitude=${location.lat}`,
                `longitude=${location.lon}`,
                'current_weather=true',
                'hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode',
                'daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset',
                'timezone=auto'
            ].join('&');

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
            const data = await res.json();
            setWeatherData(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Weather fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('sparta_weather_location');
        if (!saved && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village || 'Рядом';
                    const newLoc = { lat: latitude, lon: longitude, name: city };
                    setLocation(newLoc);
                    safeLocalStorage.setItem('sparta_weather_location', JSON.stringify(newLoc));
                } catch (e) { }
            });
        }
    }, []);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 300000); // 5 min for "real-time"
        return () => clearInterval(interval);
    }, [location.lat, location.lon]);

    const handleLocationChange = (lat: number, lon: number, name: string) => {
        const newLoc = { lat, lon, name };
        setLocation(newLoc);
        safeLocalStorage.setItem('sparta_weather_location', JSON.stringify(newLoc));
    };

    if (loading && !weatherData) return null;

    const getWeatherIcon = (code: number) => {
        if (code === 0) return <Sun size={14} className="text-yellow-400" />;
        if (code <= 3) return <Cloud size={14} className="text-secondary" />;
        if (code >= 51 && code <= 67) return <CloudRain size={14} className="text-blue-400" />;
        if (code >= 71 && code <= 77) return <Snowflake size={14} className="text-cyan-200" />;
        if (code >= 95) return <CloudLightning size={14} className="text-sparta-gold" />;
        return <Cloud size={14} className="text-muted" />;
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md cursor-pointer hover:bg-white/10 hover:border-sparta-gold/30 transition-all group"
            >
                <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                    {getWeatherIcon(weatherData?.current_weather?.weathercode || 0)}
                </div>
                <div className="flex flex-col min-w-0 sm:min-w-[40px]">
                    <span className="text-[9px] sm:text-[10px] font-black leading-none text-white">{Math.round(weatherData?.current_weather?.temperature || 0)}°C</span>
                    <span className="text-[7px] font-bold uppercase tracking-widest text-white/30 truncate max-w-[60px] hidden sm:block">{location.name}</span>
                </div>
            </motion.div>

            <AnimatePresence>
                {isModalOpen && (
                    <WeatherModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        weatherData={weatherData}
                        locationName={location.name}
                        onLocationChange={handleLocationChange}
                        lastUpdated={lastUpdated}
                        onRefresh={fetchWeather}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

const AnimatedEmoji = ({ url, className }: { url: string, className?: string }) => {
    const [animationData, setAnimationData] = useState<any>(null);

    useEffect(() => {
        setAnimationData(null); // Reset when URL changes
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => setAnimationData(data))
            .catch(err => {
                // Silent error, fallback will take over
                console.warn("Lottie suppressed:", err.message);
            });
    }, [url]);

    if (!animationData) return <div className={className} />;

    return <Lottie animationData={animationData} loop={true} className={className} />;
};



const CircularProgress = ({ size = 24, strokeWidth = 2, progress = 0, className = "" }: { size?: number, strokeWidth?: number, progress?: number, className?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    className="text-white/10"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="text-sparta-gold transition-all duration-300 ease-in-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-sparta-gold animate-pulse" />
            </div>
        </div>
    );
};

const copyImageToClipboard = async (url: string) => {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            if (blob.type === 'image/png') {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return true;
            }
            if (typeof createImageBitmap === 'function') {
                const imgBitmap = await createImageBitmap(blob);
                const canvas = document.createElement('canvas');
                canvas.width = imgBitmap.width;
                canvas.height = imgBitmap.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(imgBitmap, 0, 0);
                    const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (pngBlob) {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': pngBlob })
                        ]);
                        return true;
                    }
                }
            }
        }
    } catch (err) {
        console.warn("Direct fetch blob copy failed, trying Image element fallback:", err);
    }

    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");
        ctx.drawImage(img, 0, 0);

        const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!pngBlob) throw new Error("Failed to create PNG blob");

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob })
        ]);
        return true;
    } catch (err2) {
        console.error("All binary image copy attempts failed:", err2);
        return false;
    }
};

const downloadFile = async (url: string, fileName: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();

        // Modern approach: showSaveFilePicker (Chrome/Edge) - Forces OS Save Dialog
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Файл',
                        accept: { [blob.type]: [`.${fileName.split('.').pop()}`] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return true;
            } catch (err: any) {
                // If user cancels (AbortError), don't do anything
                if (err.name === 'AbortError') return true;
                console.warn("Save picker failed, falling back to basic download", err);
            }
        }

        // Classic approach: <a> download (may auto-save to Downloads folder based on browser settings)
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        return true;
    } catch (err) {
        console.error("Download failed:", err);
        window.open(url, '_blank');
        return false;
    }
};

interface ParticipantItemProps {
    uid: string;
    currentUserId: string;
    onStartChat: (uid: string, name: string) => void;
    onRemove: (uid: string) => void;
    isAdmin: boolean;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({ uid, currentUserId, onStartChat, onRemove, isAdmin }) => {
    const [name, setName] = useState<string>(uid);
    useEffect(() => {
        if (uid === currentUserId) {
            setName('Вы');
            return;
        }
        const fetchName = async () => {
            const docSnap = await getDoc(doc(db, 'users', uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fullName = data.childName || `${data.childFirstName || ''} ${data.childLastName || ''}`.trim();
                setName(fullName || data.full_name || uid);
            }
        };
        fetchName();
    }, [uid, currentUserId]);

    return (
        <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 group/participant">
            <span className="text-[10px] text-secondary font-medium">{name}</span>
            <div className="flex items-center gap-2">
                {uid !== currentUserId && (
                    <button
                        onClick={() => onStartChat(uid, name)}
                        className="p-2 bg-sparta-gold/10 text-sparta-gold rounded-lg opacity-60 group-hover/participant:opacity-100 transition-all hover:bg-sparta-gold hover:text-black cursor-pointer"
                        title="Написать сообщение"
                    >
                        <MessageSquare size={12} />
                    </button>
                )}
                {isAdmin && uid !== currentUserId && (
                    <button
                        className="p-1 px-2 bg-red-500/10 text-red-500 rounded text-[8px] font-black uppercase tracking-tighter hover:bg-red-500/20 transition-all"
                        onClick={() => onRemove(uid)}
                    >
                        Удалить
                    </button>
                )}
            </div>
        </div>
    );
};

const GroupChat: React.FC<GroupChatProps> = ({
    user,
    userProfile,
    groupId,
    groupName,
    isUnifiedChat = false,
    chatId,
    onSelectChat,
    onStartPrivateChat,
    onBack
}) => {
    const isAdmin = ['admin', 'developer', 'dev', 'director', 'staff'].includes(userProfile?.role?.toLowerCase() || "");
    const isTrainer = ['trainer', 'coach', 'instructor'].includes(userProfile?.role?.toLowerCase() || "");

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState<'all' | 'schedule' | 'important' | 'coach' | 'polls' | 'media' | 'links'>('all');
    const [searchDate, setSearchDate] = useState<string>('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [showResultsDrawer, setShowResultsDrawer] = useState<boolean>(false);
    const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const messageDates = useMemo(() => {
        const set = new Set<string>();
        for (const m of messages) {
            try {
                if (m.timestamp?.toDate) {
                    set.add(format(m.timestamp.toDate(), 'yyyy-MM-dd'));
                } else if (m.timestamp?.seconds) {
                    set.add(format(new Date(m.timestamp.seconds * 1000), 'yyyy-MM-dd'));
                }
            } catch (e) { }
        }
        return set;
    }, [messages]);

    const messageCountByDate = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of messages) {
            try {
                const d = m.timestamp?.toDate
                    ? format(m.timestamp.toDate(), 'yyyy-MM-dd')
                    : (m.timestamp?.seconds ? format(new Date(m.timestamp.seconds * 1000), 'yyyy-MM-dd') : null);
                if (d) counts[d] = (counts[d] || 0) + 1;
            } catch (e) { }
        }
        return counts;
    }, [messages]);

    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const matchedMessages = useMemo(() => {
        if (!chatSearchQuery.trim() && searchFilter === 'all' && !searchDate) return [];

        return messages.filter(msg => {
            if (msg.isDeleted) return false;

            // Date Filter
            if (searchDate) {
                try {
                    const msgDateStr = msg.timestamp?.toDate
                        ? format(msg.timestamp.toDate(), 'yyyy-MM-dd')
                        : (msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'yyyy-MM-dd') : null);
                    if (msgDateStr !== searchDate) return false;
                } catch (e) {
                    return false;
                }
            }

            // Category Smart Filter
            if (searchFilter === 'schedule') {
                const isSchedule = msg.type === 'schedule_announcement' ||
                    (typeof msg.text === 'string' && (msg.text.includes('SPARTA • РАСПИСАНИЕ') || msg.text.includes('РАСПИСАНИЕ') || msg.text.includes('Группа:')));
                if (!isSchedule) return false;
            } else if (searchFilter === 'important') {
                const isImportant = Boolean(
                    msg.isPinned ||
                    msg.type === 'schedule_announcement' ||
                    msg.senderRole === 'admin' ||
                    msg.senderRole === 'director' ||
                    msg.senderName?.toLowerCase().includes('администрация') ||
                    (typeof msg.text === 'string' && (msg.text.includes('⚠️') || msg.text.includes('‼️') || msg.text.includes('Внимание') || msg.text.includes('ВАЖНО')))
                );
                if (!isImportant) return false;
            } else if (searchFilter === 'coach') {
                const isCoach = Boolean(
                    msg.senderRole === 'coach' ||
                    msg.senderRole === 'trainer' ||
                    msg.senderName?.toLowerCase().includes('тренер')
                );
                if (!isCoach) return false;
            } else if (searchFilter === 'polls') {
                if (msg.type !== 'poll') return false;
            } else if (searchFilter === 'media') {
                const isMedia = Boolean(msg.mediaUrl || msg.mediaType || msg.type === 'voice' || msg.type === 'media_group');
                if (!isMedia) return false;
            } else if (searchFilter === 'links') {
                const hasLink = Boolean(msg.text && /(https?:\/\/|www\.)[^\s]+/i.test(msg.text));
                if (!hasLink) return false;
            }

            // Text search
            if (chatSearchQuery.trim()) {
                const q = chatSearchQuery.trim().toLowerCase();
                const textMatch = Boolean(msg.text?.toLowerCase().includes(q));
                const senderMatch = Boolean(msg.senderName?.toLowerCase().includes(q));
                const mediaMatch = Boolean(msg.mediaUrl?.toLowerCase().includes(q));
                return textMatch || senderMatch || mediaMatch;
            }

            return true;
        });
    }, [messages, chatSearchQuery, searchFilter, searchDate]);

    const groupedMediaByMonth = useMemo(() => {
        if (searchFilter !== 'media') return [];
        const groups: { monthKey: string; monthLabel: string; items: any[] }[] = [];
        const map = new Map<string, any[]>();

        matchedMessages.forEach(msg => {
            if (!msg.mediaUrl) return;
            let dateObj: Date | null = null;
            try {
                if (msg.timestamp?.toDate) dateObj = msg.timestamp.toDate();
                else if (msg.timestamp?.seconds) dateObj = new Date(msg.timestamp.seconds * 1000);
            } catch (e) { }
            if (!dateObj) dateObj = new Date();

            const key = format(dateObj, 'yyyy-MM');
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(msg);
        });

        map.forEach((items, monthKey) => {
            try {
                const parts = monthKey.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
                groups.push({
                    monthKey,
                    monthLabel: format(d, 'LLLL yyyy', { locale: ru }),
                    items
                });
            } catch (e) { }
        });

        return groups;
    }, [matchedMessages, searchFilter]);

    useEffect(() => {
        setCurrentMatchIndex(0);
        if (matchedMessages.length > 0 && isSearchExpanded) {
            scrollToMessage(matchedMessages[0].id);
        }
    }, [chatSearchQuery, searchFilter, searchDate]);

    const handlePrevMatch = () => {
        if (matchedMessages.length === 0) return;
        const nextIdx = currentMatchIndex > 0 ? currentMatchIndex - 1 : matchedMessages.length - 1;
        setCurrentMatchIndex(nextIdx);
        scrollToMessage(matchedMessages[nextIdx].id);
    };

    const handleNextMatch = () => {
        if (matchedMessages.length === 0) return;
        const nextIdx = currentMatchIndex < matchedMessages.length - 1 ? currentMatchIndex + 1 : 0;
        setCurrentMatchIndex(nextIdx);
        scrollToMessage(matchedMessages[nextIdx].id);
    };
    const [showProfile, setShowProfile] = useState(false);
    const [isChatMuted, setIsChatMuted] = useState(() => {
        return safeLocalStorage.getItem(`chat_mute_${chatId || groupId}`) === 'true';
    });

    const toggleChatMute = () => {
        setIsChatMuted(prev => {
            const next = !prev;
            safeLocalStorage.setItem(`chat_mute_${chatId || groupId}`, String(next));
            return next;
        });
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('Вы действительно хотите покинуть эту группу?')) return;
        try {
            await handleKickParticipant(user.uid, userProfile?.full_name || 'Участник');
            setShowProfile(false);
            if (onBack) onBack();
        } catch (e) {
            console.error('Leave group error:', e);
        }
    };
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [forwardMessages, setForwardMessages] = useState<any[]>([]);
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [selectedForwardGroups, setSelectedForwardGroups] = useState<string[]>([]);
    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [groupData, setGroupData] = useState<any>(null);

    const groupTrainingDays = useMemo(() => {
        if (Array.isArray(groupData?.schedule) && groupData.schedule.length > 0) {
            return groupData.schedule.map((s: any) => s.day).filter(Boolean);
        }
        return ['Суббота', 'Воскресенье'];
    }, [groupData?.schedule]);
    const [isRecording, setIsRecording] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
    const deletedMsgIdsRef = useRef<Set<string>>(new Set());
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<MediaUploadItem[]>([]);
    const [isMediaTrayOpen, setIsMediaTrayOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [filterThreadId, setFilterThreadId] = useState<string | null>(null);
    const [threadMessage, setThreadMessage] = useState('');
    const [isThreadSending, setIsThreadSending] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string, targetBounds?: any, isOwn?: boolean } | null>(null);
    const [selectedMediaForLightbox, setSelectedMediaForLightbox] = useState<any>(null);
    const [isEditingChat, setIsEditingChat] = useState(false);
    const [editChatName, setEditChatName] = useState('');
    const [editChatAvatar, setEditChatAvatar] = useState('');
    const [editChatTopic, setEditChatTopic] = useState('');
    const [editChatDescription, setEditChatDescription] = useState('');
    const [isChatPrivate, setIsChatPrivate] = useState(false);
    const [showParticipantManager, setShowParticipantManager] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
    const [isTranscribing, setIsTranscribing] = useState<Record<string, boolean>>({});
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [availableSessions, setAvailableSessions] = useState<any[]>([]);
    const [isEditingSession, setIsEditingSession] = useState(false);
    const [editingSessionData, setEditingSessionData] = useState<any>(null);
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
    const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
    const [isExtraActionsOpen, setIsExtraActionsOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    const [userPrefs, setUserPrefs] = useState<any>(null);
    const [typingUsers, setTypingUsers] = useState<any[]>([]);
    const [mentionPosition, setMentionPosition] = useState<{ x: number, y: number } | null>(null);
    const [mentionSearch, setMentionSearch] = useState<string | null>(null);

    // Gallery States
    const [activeGalleryTab, setActiveGalleryTab] = useState<'media' | 'files' | 'audio'>('media');
    const [gallerySearchQuery, setGallerySearchQuery] = useState('');
    const [isGallerySelectMode, setIsGallerySelectMode] = useState(false);
    const [selectedGalleryItems, setSelectedGalleryItems] = useState<string[]>([]);

    const typingTimeoutRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const threadContainerRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<any>(null);

    // Emojis for Reactions
    const REACTION_EMOJIS = [
        { key: 'love', emoji: '❤️', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/lottie.json' },
        { key: 'fire', emoji: '🔥', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/lottie.json' },
        { key: 'like', emoji: '👍', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/lottie.json' },
        { key: 'laugh', emoji: '😂', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/lottie.json' },
        { key: 'wow', emoji: '😮', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/lottie.json' },
        { key: 'party', emoji: '🎉', lottie: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/lottie.json' }
    ];

    const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
    const [participantSearchQuery, setParticipantSearchQuery] = useState('');
    const [participantSearchResults, setParticipantSearchResults] = useState<any[]>([]);
    const [isSearchingParticipants, setIsSearchingParticipants] = useState(false);

    const getUserStatus = (lastSeen: any) => {
        if (!lastSeen) return 'не в сети';
        const lastSeenMs = lastSeen.toMillis?.() || (lastSeen.seconds * 1000) || 0;
        const diff = Date.now() - lastSeenMs;

        if (diff < 120000) return 'в сети'; // 2 minutes
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
        return `недавно`;
    };

    const handleSearchParticipants = async (queryStr: string) => {
        setParticipantSearchQuery(queryStr);
        if (queryStr.length < 2) {
            setParticipantSearchResults([]);
            return;
        }

        setIsSearchingParticipants(true);
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const searchStr = queryStr.toLowerCase();

            const results = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((u: any) => {
                    const nameFields = [
                        u.full_name,
                        u.childName,
                        u.childFirstName,
                        u.childLastName,
                        u.displayName,
                        u.email,
                        u.childName // checking again to be safe
                    ].filter(Boolean).map(f => f.toLowerCase());

                    const matchesName = nameFields.some(f => f.includes(searchStr));
                    const isAlreadyInGroup = groupData?.participants?.includes(u.id);
                    const isMe = u.id === user.uid;

                    return matchesName && !isAlreadyInGroup && !isMe;
                })
                .slice(0, 10);

            setParticipantSearchResults(results);
        } catch (error) {
            console.error("Error searching participants:", error);
        } finally {
            setIsSearchingParticipants(false);
        }
    };

    const handleAddParticipant = async (participantId: string) => {
        if (!isUnifiedChat || !chatId) return;

        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                participants: arrayUnion(participantId)
            });

            // Add a system message
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const newMember = participantSearchResults.find(m => m.id === participantId) || userSearchResults.find(m => m.id === participantId);
            await addDoc(messagesRef, {
                text: `${newMember?.full_name || 'Новый участник'} добавлен(а) в чат`,
                type: 'system',
                timestamp: serverTimestamp()
            });

            setIsAddParticipantOpen(false);
            setParticipantSearchQuery('');
            setParticipantSearchResults([]);
        } catch (error) {
            console.error("Error adding participant:", error);
            alert("Ошибка при добавлении участника");
        }
    };

    const isOwner = groupData?.createdBy === user?.uid;
    const canEditAvatar = isOwner || isAdmin || userProfile?.role === 'developer';

    const getRoleBadge = (member: any) => {
        const role = member.role?.toLowerCase();
        const isMemberOwner = groupData?.createdBy === member.id;

        if (isMemberOwner) return { label: 'Владелец', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Crown };
        if (role === 'admin') return { label: 'Администратор', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Shield };
        if (role === 'developer' || role === 'dev') return { label: 'Разработчик', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Code };
        if (role === 'trainer' || role === 'coach') return { label: 'Тренер', color: 'text-green-400', bg: 'bg-green-400/10', icon: Dumbbell };
        if (role === 'director') return { label: 'Директор', color: 'text-red-400', bg: 'bg-red-400/10', icon: BadgeCheck };

        return null;
    };

    const handleKickParticipant = async (participantId: string, participantName: string) => {
        if (!isUnifiedChat || !chatId || !isOwner) return;
        if (participantId === user.uid) return;

        if (!window.confirm(`Вы уверены, что хотите исключить ${participantName} из группы?`)) return;

        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                participants: arrayRemove(participantId)
            });

            // Add system message
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: `${participantName} был(а) исключен(а) из группы владельцем`,
                type: 'system',
                timestamp: serverTimestamp()
            });

            // Update local state if needed (snapshot will handle it, but for stats)
            setGroupMembers(prev => prev.filter(m => m.id !== participantId));
        } catch (error) {
            console.error("Error kicking participant:", error);
            alert("Ошибка при исключении участника");
        }
    };

    const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string) => {
        if (!isUnifiedChat || !chatId || !isOwner) return;
        if (newOwnerId === user.uid) return;

        if (!window.confirm(`Вы уверены, что хотите передать права владельца ${newOwnerName}? Это действие нельзя отменить.`)) return;

        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                createdBy: newOwnerId
            });

            // Add system message
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: `Владелец группы сменился. Теперь им является ${newOwnerName}`,
                type: 'system',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error transferring ownership:", error);
            alert("Ошибка при передаче прав");
        }
    };

    const handleStartPrivateChat = async (targetUid: string, targetName: string) => {
        if (!targetUid || !onSelectChat) return;

        try {
            console.log("Starting private chat with:", targetUid, targetName);

            const chatsRef = collection(db, 'chats');
            const q = query(
                chatsRef,
                where('participants', 'array-contains', user.uid)
            );
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            // Strictly find a private chat between these two users (must have 2 participants and NO groupId)
            const existingChat = docs.find(doc =>
                (doc.type === 'private' || doc.isPrivate === true) &&
                !doc.groupId &&
                doc.participants?.length === 2 &&
                doc.participants?.includes(targetUid)
            );

            if (existingChat) {
                console.log("Found existing chat:", existingChat.id);
                onSelectChat(existingChat);
                // Close all potential overlays
                setShowProfile(false);
                setIsAddParticipantOpen(false);
                setShowParticipantManager(false);
                setIsEditingChat(false);
                return;
            }

            // Create new private chat if none exists
            const myName = userProfile?.full_name || userProfile?.childName || user.email || "Пользователь";
            const newChatRef = await addDoc(collection(db, 'chats'), {
                name: `Чат с ${targetName}`,
                isPrivate: true,
                type: 'private',
                participants: [user.uid, targetUid],
                participantNames: {
                    [user.uid]: myName,
                    [targetUid]: targetName
                },
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                lastMessage: "Чат создан",
                lastMessageAt: serverTimestamp(),
                lastMessageBy: user.uid
            });

            console.log("Created new chat:", newChatRef.id);

            onSelectChat({
                id: newChatRef.id,
                name: `Чат с ${targetName}`,
                isPrivate: true,
                type: 'private',
                participants: [user.uid, targetUid],
                participantNames: {
                    [user.uid]: myName,
                    [targetUid]: targetName
                }
            });

            // Close all potential overlays
            setShowProfile(false);
            setIsAddParticipantOpen(false);
            setShowParticipantManager(false);
            setIsEditingChat(false);
        } catch (error: any) {
            console.error("Error starting private chat:", error);
        }
    };

    // Fetch User Chat Prefs for this specific chat
    useEffect(() => {
        if (!user?.uid || !chatId) return;
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const unsubscribe = onSnapshot(prefRef, (snap) => {
            if (snap.exists()) {
                setUserPrefs(snap.data());
            } else {
                setUserPrefs({});
            }
        });
        return () => unsubscribe();
    }, [user?.uid, chatId]);

    // Messages Listener
    useEffect(() => {
        if (!groupId && !chatId) return;

        let messagesRef;
        let q;

        if (isUnifiedChat && chatId) {
            messagesRef = collection(db, 'chats', chatId, 'messages');
            q = query(messagesRef);
        } else {
            messagesRef = collection(db, 'group_messages');
            q = query(messagesRef, where('groupId', '==', groupId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let loadedMessages = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id, // Always use real Firestore doc.id for deletions
                __source: isUnifiedChat && chatId ? 'unified' : 'legacy',
                __chatId: chatId
            })) as any[];

            // Sync persistent deleted IDs from localStorage
            try {
                const storageKey = `sparta_deleted_msgs_${chatId || groupId || 'global'}`;
                const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
                if (Array.isArray(stored)) {
                    stored.forEach((id: string) => deletedMsgIdsRef.current.add(id));
                }
            } catch (e) {}

            // Filter out locally deleted IDs and soft-deleted messages so they never resurrect on image/message upload or snapshot refreshes
            loadedMessages = loadedMessages.filter(m => !m.isDeleted && !deletedMsgIdsRef.current.has(m.id));

            if (userPrefs?.lastClearedAt) {
                const clearTime = userPrefs.lastClearedAt.toMillis?.() || (userPrefs.lastClearedAt.seconds * 1000) || 0;
                loadedMessages = loadedMessages.filter(m => {
                    if (!m.timestamp) return true;
                    const msgTime = m.timestamp.toMillis?.() || (m.timestamp.seconds * 1000) || 0;
                    return msgTime > clearTime;
                });
            }

            const getMsgTime = (m: any) => {
                if (m.timestamp?.toMillis) return m.timestamp.toMillis();
                if (typeof m.timestamp?.seconds === 'number') return m.timestamp.seconds * 1000;
                if (m.createdAt?.toMillis) return m.createdAt.toMillis();
                if (typeof m.createdAt?.seconds === 'number') return m.createdAt.seconds * 1000;
                if (m.localTimestamp) return m.localTimestamp;
                return Date.now();
            };

            loadedMessages.sort((a, b) => getMsgTime(a) - getMsgTime(b));

            setMessages((prev: any[]) => {
                const pendingLocal = prev.filter((m: any) =>
                    typeof m.id === 'string' && (m.id.startsWith('local-') || m.id.startsWith('voice-') || m.id.startsWith('upload-'))
                );
                const unconfirmedPending = pendingLocal.filter((p: any) =>
                    !loadedMessages.some((l: any) =>
                        (l.id === p.id) ||
                        (l.text && l.text === p.text && l.senderId === p.senderId && Math.abs(getMsgTime(l) - getMsgTime(p)) < 15000)
                    )
                );
                const combined = [...loadedMessages, ...unconfirmedPending];
                combined.sort((a, b) => getMsgTime(a) - getMsgTime(b));
                return combined;
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [groupId, chatId, isUnifiedChat, userPrefs]);

    // Metadata Listener (Pinned, ReadBy, Participants)
    useEffect(() => {
        if (!groupId && !chatId) return;

        const metadataRef = isUnifiedChat && chatId ? doc(db, 'chats', chatId) : (groupId ? doc(db, 'groups', groupId) : null);
        if (!metadataRef) return;

        const unsubscribe = onSnapshot(metadataRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();

                if (isUnifiedChat && data.participants?.some((p: any) => typeof p !== 'string')) {
                    const sanitized = data.participants.map((p: any) => {
                        if (typeof p === 'string') return p;
                        return p?.id || p?.uid || null;
                    }).filter((p: any) => typeof p === 'string' && p.length > 0);

                    updateDoc(doc(db, 'chats', chatId!), { participants: sanitized }).catch(console.error);
                }

                setGroupData({ id: snapshot.id, ...data });

                if (isUnifiedChat) {
                    setEditChatName(data.name || '');
                    setEditChatAvatar(data.avatarUrl || '');
                    setEditChatTopic(data.topic || '');
                    setEditChatDescription(data.description || '');
                    setIsChatPrivate(data.isPrivate || false);
                }

                if (data.pinnedMessageId) {
                    const msgRef = isUnifiedChat && chatId
                        ? doc(db, 'chats', chatId, 'messages', data.pinnedMessageId)
                        : doc(db, 'group_messages', data.pinnedMessageId);

                    onSnapshot(msgRef, (msgSnap) => {
                        if (msgSnap.exists()) {
                            setPinnedMessage({ id: msgSnap.id, ...msgSnap.data() });
                        } else {
                            setPinnedMessage(null);
                        }
                    });
                } else {
                    setPinnedMessage(null);
                }
            }
        });

        return () => unsubscribe();
    }, [groupId, chatId, isUnifiedChat]);

    // Typing Indicator Listener
    useEffect(() => {
        if (!chatId) return;
        const typingRef = collection(db, 'chats', chatId, 'typing');
        const q = query(typingRef, where('isTyping', '==', true), limit(5));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const typing: any[] = [];
            for (const d of snapshot.docs) {
                if (d.id !== user.uid) {
                    const data = d.data();
                    // Optional: check if status is fresh (last 10 seconds)
                    const lastUpdate = data.updatedAt?.toMillis() || 0;
                    if (Date.now() - lastUpdate < 10000) {
                        typing.push({ id: d.id, name: data.name });
                    }
                }
            }
            setTypingUsers(typing);
        });

        return () => {
            unsubscribe();
            // Clean up my typing status when leaving
            if (user?.uid) {
                deleteDoc(doc(db, 'chats', chatId, 'typing', user.uid)).catch(() => { });
            }
        };
    }, [chatId, user?.uid]);

    // Update readBy status when new messages arrive
    useEffect(() => {
        if (!chatId || !user?.uid || !messages.length) return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderId !== user.uid) {
            const chatRef = doc(db, 'chats', chatId);
            updateDoc(chatRef, {
                [`readBy.${user.uid}`]: serverTimestamp()
            }).catch(() => { });
        }
    }, [chatId, user?.uid, messages.length]);

    const updateTypingStatus = async (isTyping: boolean) => {
        if (!chatId || !user?.uid) return;
        const myTypingRef = doc(db, 'chats', chatId, 'typing', user.uid);

        if (isTyping) {
            await setDoc(myTypingRef, {
                isTyping: true,
                name: userProfile?.full_name || user.email,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } else {
            await deleteDoc(myTypingRef);
        }
    };

    // Auto-focus search input when expanded
    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isSearchExpanded]);

    const handleNewMessageChange = (val: string) => {
        setNewMessage(val);

        if (!user?.uid) return;

        // Mentions detection
        const cursorPosition = (document.activeElement as HTMLTextAreaElement)?.selectionStart || 0;
        const textBeforeCursor = val.substring(0, cursorPosition);
        const lastAtMatch = textBeforeCursor.match(/@(\w*)$/);

        if (lastAtMatch) {
            setMentionSearch(lastAtMatch[1]);
            // Simplified positioning logic (can be improved with a hidden span to mirror textarea)
            setMentionPosition({ x: 100, y: -200 });
        } else {
            setMentionSearch(null);
        }

        // Update typing status
        updateTypingStatus(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            updateTypingStatus(false);
            typingTimeoutRef.current = null;
        }, 3000);
    };

    const scrollToBottom = useCallback((smooth = false) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            scrollToBottom(false);
        }, 50);
        return () => clearTimeout(timeout);
    }, [chatId, groupId, scrollToBottom]);

    useEffect(() => {
        scrollToBottom(true);
    }, [messages.length, scrollToBottom]);

    useEffect(() => {
        if (filterThreadId && threadContainerRef.current) {
            threadContainerRef.current.scrollTo({
                top: threadContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [filterThreadId, messages.length]);

    const groupedMessages = useMemo(() => {
        const result: any[] = [];
        let currentGroup: any = null;

        messages.forEach((msg, idx) => {
            const isMedia = msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video') && !msg.text;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

            const canBeInGroup = isMedia && !msg.replyToId && !msg.isDeleted;
            const isConsecutiveWithPrev = canBeInGroup && prevMsg &&
                prevMsg.senderId === msg.senderId &&
                prevMsg.mediaUrl && !prevMsg.text && !prevMsg.replyToId &&
                (msg.timestamp?.seconds - prevMsg.timestamp?.seconds) < 60;

            const hasNextConsecutive = canBeInGroup && nextMsg &&
                nextMsg.senderId === msg.senderId &&
                nextMsg.mediaUrl && !nextMsg.text && !nextMsg.replyToId &&
                (nextMsg.timestamp?.seconds - msg.timestamp?.seconds) < 60;

            if (isConsecutiveWithPrev && currentGroup && currentGroup.type === 'media_group') {
                currentGroup.items.push(msg);
            } else if (hasNextConsecutive && !isConsecutiveWithPrev) {
                currentGroup = {
                    type: 'media_group',
                    id: 'group_' + msg.id,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    senderPhoto: msg.senderPhoto,
                    senderRole: msg.senderRole,
                    timestamp: msg.timestamp,
                    items: [msg]
                };
                result.push(currentGroup);
            } else if (!isConsecutiveWithPrev) {
                result.push(msg);
                currentGroup = msg;
            }
        });
        return result;
    }, [messages]);

    const threadCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        messages.forEach(msg => {
            if (msg.replyToId) {
                counts[msg.replyToId] = (counts[msg.replyToId] || 0) + 1;
            }
        });
        return counts;
    }, [messages]);

    const allGalleryMediaItems = useMemo<GalleryMediaItem[]>(() => {
        const items: GalleryMediaItem[] = [];
        messages.forEach(msg => {
            if (msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video' || msg.mediaType === 'file')) {
                items.push({
                    id: msg.id,
                    mediaUrl: msg.mediaUrl,
                    mediaType: msg.mediaType || 'image',
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    senderRole: msg.senderRole,
                    senderVerification: msg.senderVerification,
                    senderAvatar: msg.senderAvatar || msg.senderPhoto,
                    timestamp: msg.timestamp,
                    text: msg.text,
                    category: msg.category || 'general',
                    fileName: msg.fileName
                });
            }
        });
        return items;
    }, [messages]);

    useEffect(() => {
        // Fetch groups for forwarding based on role
        const fetchForwardGroups = async () => {
            try {
                let q;
                const groupsRef = collection(db, "groups");
                if (userProfile?.role?.toLowerCase() === 'admin') {
                    q = query(groupsRef, where("chatEnabled", "==", true));
                } else if (userProfile?.coachId) {
                    q = query(groupsRef, where("coachId", "==", userProfile.coachId), where("chatEnabled", "==", true));
                } else {
                    return;
                }
                const snap = await getDocs(q);
                setMyGroups(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
            } catch (err) {
                console.error("Error fetching forwarding groups:", err);
            }
        };
        fetchForwardGroups();
    }, [userProfile]);

    useEffect(() => {
        if (!isUnifiedChat || !chatId || !groupData?.participants) return;

        let unsubscribe: () => void = () => { };

        // For unified chats, participants are explicitly listed in groupData.participants
        const participants = groupData.participants.filter((p: any) => typeof p === 'string');
        if (participants.length === 0) {
            setGroupMembers([]);
            return;
        }

        const q = query(collection(db, 'users'), where(documentId(), 'in', participants.slice(0, 30)));
        unsubscribe = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            setGroupMembers(members);

            // Auto-sync participantNames for private/direct chats
            const isDirectType = Boolean(
                groupData?.isPrivate ||
                groupData?.type === 'private' ||
                groupData?.type === 'direct' ||
                groupData?.type === 'parent' ||
                groupData?.type === 'child' ||
                (Array.isArray(groupData?.participants) && groupData.participants.length === 2 && !groupData?.groupId)
            );
            if (isDirectType && members.length >= 2) {
                const myName = userProfile?.full_name || userProfile?.childName || user.email || "Пользователь";
                const other = members.find(m => m.id !== user.uid);
                const otherName = other ? (other.childName || other.full_name || other.email || 'Участник') : 'Участник';

                const currentNames = groupData.participantNames || {};
                if (!groupData.participantNames || currentNames[user.uid] !== myName || (other && currentNames[other.id] !== otherName)) {
                    console.log("Auto-patching participantNames for chat:", chatId);
                    updateDoc(doc(db, 'chats', chatId), {
                        participantNames: {
                            ...currentNames,
                            [user.uid]: myName,
                            [other?.id || '']: otherName
                        }
                    }).catch(console.error);
                }
            }
        });

    }, [chatId, isUnifiedChat, userProfile, groupData?.participants, groupData?.isPrivate, groupData?.type]);

    useEffect(() => {
        if (!groupId) return;
        const templatesRef = collection(db, 'groups', groupId, 'training_templates');
        const unsubscribe = onSnapshot(templatesRef, (snapshot) => {
            const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAvailableSessions(templates);
        });
        return () => unsubscribe();
    }, [groupId]);

    useEffect(() => {
        if (!isUnifiedChat && groupId) {
            const q = query(collection(db, 'users'), where('groupId', '==', groupId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGroupMembers(members);
            });
            return () => unsubscribe();
        }
    }, [groupId, isUnifiedChat]);

    const allMediaMessages = messages.filter(m => m.mediaUrl && !m.isDeleted);

    const mediaItems = allMediaMessages.filter(m => m.mediaType === 'image' || m.mediaType === 'video');
    const fileItems = allMediaMessages.filter(m => m.mediaType === 'file');
    const audioItems = allMediaMessages.filter(m => m.mediaType === 'audio');

    const filteredGalleryItems = (() => {
        const items = activeGalleryTab === 'media' ? mediaItems :
            activeGalleryTab === 'files' ? fileItems : audioItems;

        if (!gallerySearchQuery.trim()) return items;

        return items.filter(item => {
            const search = gallerySearchQuery.toLowerCase();
            return (item.text?.toLowerCase().includes(search)) ||
                (item.senderName?.toLowerCase().includes(search)) ||
                (item.mediaUrl?.toLowerCase().includes(search));
        });
    })();

    const handlePinMessage = async (msgId: string) => {
        try {
            const targetRef = isUnifiedChat && chatId ? doc(db, 'chats', chatId) : doc(db, 'groups', groupId!);
            const isCurrentlyPinned = (pinnedMessage?.id === msgId) || (groupData?.pinnedMessageId === msgId);
            const nextPinnedId = isCurrentlyPinned ? null : msgId;
            await updateDoc(targetRef, {
                pinnedMessageId: nextPinnedId
            });
            if (isCurrentlyPinned) {
                setPinnedMessage(null);
            } else {
                const msg = messages.find(m => m.id === msgId);
                if (msg) setPinnedMessage(msg);
            }
            if (groupData) {
                setGroupData(prev => prev ? ({ ...prev, pinnedMessageId: nextPinnedId }) : null);
            }
        } catch (error) {
            console.error("Error toggling pin on message:", error);
        }
    };

    const handleUnpinMessage = async () => {
        try {
            const targetRef = isUnifiedChat && chatId ? doc(db, 'chats', chatId) : doc(db, 'groups', groupId!);
            await updateDoc(targetRef, {
                pinnedMessageId: null
            });
            setPinnedMessage(null);
            if (groupData) {
                setGroupData(prev => prev ? ({ ...prev, pinnedMessageId: null }) : null);
            }
        } catch (error) {
            console.error("Error unpinning message:", error);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!msgId) return;
        deletedMsgIdsRef.current.add(msgId);

        // Save deleted ID to localStorage so it persists across reloads
        try {
            const storageKey = `sparta_deleted_msgs_${chatId || groupId || 'global'}`;
            const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
            if (Array.isArray(stored) && !stored.includes(msgId)) {
                stored.push(msgId);
                safeLocalStorage.setItem(storageKey, JSON.stringify(stored));
            }
        } catch (e) {}

        // If currently playing this voice message, stop playback immediately
        if (playingVoiceId === msgId) {
            if (voiceAudioRef.current) {
                try { voiceAudioRef.current.pause(); } catch (e) {}
            }
            setPlayingVoiceId(null);
        }

        const msg = messages.find(m => m.id === msgId);
        
        // Optimistically remove from local state for instant UI update
        setMessages((prev: any[]) => prev.filter(m => m.id !== msgId));

        try {
            const targetDoc = (msg && msg.__source === 'unified') || (isUnifiedChat && chatId)
                ? doc(db, 'chats', msg?.__chatId || chatId, 'messages', msgId)
                : doc(db, 'group_messages', msgId);

            // 1. Mark as soft-deleted in Firestore first (updating is allowed by security rules)
            await updateDoc(targetDoc, {
                isDeleted: true,
                text: '',
                mediaUrl: null,
                mediaType: null,
                deletedAt: serverTimestamp()
            }).catch(() => {});

            // 2. Attempt hard delete as well
            await deleteDoc(targetDoc).catch(() => {});
        } catch (error: any) {
            console.error("Error deleting message from database:", error);
        }
    };

    const handleUpdateChatMetadata = async () => {
        if (!chatId || !isAdmin) return;
        try {
            await updateDoc(doc(db, 'chats', chatId), {
                name: editChatName,
                avatarUrl: editChatAvatar,
                topic: editChatTopic,
                description: editChatDescription,
                isPrivate: isChatPrivate
            });
            setIsEditingChat(false);
        } catch (error) {
            console.error("Error updating chat metadata:", error);
        }
    };

    const handleSearchUsers = async (queryStr: string) => {
        setUserSearchQuery(queryStr);
        if (queryStr.length < 2) {
            setUserSearchResults([]);
            return;
        }
        setIsSearchingUsers(true);
        try {
            const usersRef = collection(db, 'users');
            // Simplified search: in production use Algolia or more complex Firestore queries
            const snapshot = await getDocs(usersRef);
            const results = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => {
                    const fullName = u.childName || `${u.childFirstName || ''} ${u.childLastName || ''}`.trim();
                    const searchStr = queryStr.toLowerCase();
                    return fullName.toLowerCase().includes(searchStr) ||
                        u.email?.toLowerCase().includes(searchStr);
                })
                .slice(0, 5);
            setUserSearchResults(results);
        } catch (error) {
            console.error("Error searching users:", error);
        }
        setIsSearchingUsers(false);
    };


    const handleAddMemberFromManager = async (participantUser: any) => {
        // This is a bridge for compatibility with old manager if needed
        return handleAddParticipant(participantUser.id);
    };


    const touchStartCoords = useRef<{ x: number, y: number } | null>(null);

    const handleContextMenu = (
        e: React.MouseEvent | React.TouchEvent | null,
        msgId: string,
        coordsOverride?: { x: number, y: number, bounds?: any }
    ) => {
        if (e) {
            try {
                e.preventDefault();
                e.stopPropagation();
            } catch (err) { }
        }
        let targetBounds = coordsOverride?.bounds;
        let x = coordsOverride?.x ?? 0;
        let y = coordsOverride?.y ?? 0;

        if (!coordsOverride && e) {
            const targetElem = (e.currentTarget || e.target) as HTMLElement;
            const b = targetElem?.getBoundingClientRect ? targetElem.getBoundingClientRect() : null;
            targetBounds = b ? { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height } : undefined;
            x = 'touches' in e && e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX || (b?.left || 0);
            y = 'touches' in e && e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent).clientY || (b?.top || 0);
        }

        const msg = messages.find(m => m.id === msgId);
        const isOwn = msg ? msg.senderId === user?.uid : false;

        setContextMenu({ x, y, msgId, targetBounds, isOwn });
    };

    const handleTouchStart = (e: React.TouchEvent, msgId: string) => {
        const touch = e.touches[0];
        if (!touch) return;
        const x = touch.clientX;
        const y = touch.clientY;
        touchStartCoords.current = { x, y };

        const targetElem = (e.currentTarget || e.target) as HTMLElement;
        const b = targetElem?.getBoundingClientRect ? targetElem.getBoundingClientRect() : null;
        const targetBounds = b ? { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height } : undefined;

        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(35);
                } catch (err) { }
            }
            handleContextMenu(null, msgId, { x, y, bounds: targetBounds });
        }, 350); // 350ms responsive long press
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartCoords.current && e.touches.length > 0) {
            const dx = Math.abs(e.touches[0].clientX - touchStartCoords.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartCoords.current.y);
            // Cancel long press if user is scrolling or moved finger > 10px
            if (dx > 10 || dy > 10) {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        touchStartCoords.current = null;
    };

    const scrollToMessage = (id: string) => {
        const element = document.getElementById(`msg-${id}`);
        if (element && messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (container.clientHeight / 2) + (elementRect.height / 2);
            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
            element.classList.add('ring-2', 'ring-sparta-gold', 'ring-offset-4', 'ring-offset-black');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-sparta-gold', 'ring-offset-4', 'ring-offset-black');
            }, 2000);
        }
    };

    const handleReaction = async (msgId: string, rawEmojiKey: string) => {
        const emojiKey = rawEmojiKey === 'heart' ? 'love' :
            rawEmojiKey === 'thumbs_up' ? 'like' :
            rawEmojiKey === 'joy' ? 'laugh' : rawEmojiKey;

        const targetMsgs = messages.filter(m => m.id === msgId || (m.items && m.items.some((it: any) => it.id === msgId)));
        if (targetMsgs.length === 0) return;

        for (const targetMsg of targetMsgs) {
            const actualId = targetMsg.id;
            const currentReactions: Record<string, string[]> = {};

            Object.entries(targetMsg.reactions || {}).forEach(([k, ids]) => {
                if (Array.isArray(ids) && ids.length > 0) {
                    currentReactions[k] = [...ids];
                }
            });

            // Check if user already reacted with this emoji (including legacy key aliases)
            const activeKey = Object.keys(currentReactions).find(k => {
                const norm = k === 'heart' ? 'love' : k === 'thumbs_up' ? 'like' : k === 'joy' ? 'laugh' : k;
                return norm === emojiKey && currentReactions[k]?.includes(user.uid);
            });

            if (activeKey) {
                // ❌ TOGGLE OFF: User clicked the same emoji -> remove reaction
                currentReactions[activeKey] = currentReactions[activeKey].filter(id => id !== user.uid);
                if (currentReactions[activeKey].length === 0) {
                    delete currentReactions[activeKey];
                }
            } else {
                // 🔄 SWITCH: Remove user from any other reactions on this message first
                Object.keys(currentReactions).forEach(k => {
                    currentReactions[k] = currentReactions[k].filter(id => id !== user.uid);
                    if (currentReactions[k].length === 0) {
                        delete currentReactions[k];
                    }
                });
                // Add new reaction
                currentReactions[emojiKey] = [...(currentReactions[emojiKey] || []), user.uid];
            }

            // Optimistic local state update
            setMessages(prev => prev.map(m => m.id === actualId ? { ...m, reactions: currentReactions } : m));

            try {
                const msgRef = isUnifiedChat && chatId
                    ? doc(db, 'chats', chatId, 'messages', actualId)
                    : doc(db, 'group_messages', actualId);

                await updateDoc(msgRef, {
                    reactions: currentReactions
                });
            } catch (error) {
                console.error("Error updating reaction:", error);
            }
        }
    };

    const handleQuickSaveToFavorites = async (msg: any) => {
        if (!user?.uid || !msg) return;
        try {
            const savedChatId = `saved_${user.uid}`;
            const forwardData = {
                text: msg.text || '',
                senderId: user.uid,
                senderName: userProfile?.full_name || userProfile?.childName || 'Вы',
                senderRole: userProfile?.role || 'student',
                senderAvatar: userProfile?.photoURL || userProfile?.avatarUrl || null,
                mediaUrl: msg.mediaUrl || null,
                mediaType: msg.mediaType || null,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                isForwarded: true,
                forwardedFrom: {
                    senderId: msg.senderId || 'unknown',
                    senderName: msg.senderName || 'Участник',
                    senderRole: msg.senderRole || 'member',
                    chatTitle: groupData?.chatTitle || groupName || 'Чат'
                }
            };
            await addDoc(collection(db, 'chats', savedChatId, 'messages'), forwardData);
            alert('Сохранено в Избранное ⭐️');
        } catch (err) {
            console.error('Error saving to favorites:', err);
        }
    };

    const currentContextMessage = useMemo(() => {
        if (!contextMenu?.msgId) return null;
        const direct = messages.find(m => m.id === contextMenu.msgId);
        if (direct) return direct;
        for (const m of messages) {
            if (m.type === 'media_group' && m.items) {
                const item = m.items.find((it: any) => it.id === contextMenu.msgId);
                if (item) {
                    return { ...m, ...item, id: contextMenu.msgId, parentMessageId: m.id };
                }
            }
        }
        return null;
    }, [contextMenu?.msgId, messages]);

    const handleForwardMessage = async () => {
        if (forwardMessages.length === 0 || selectedForwardGroups.length === 0) return;
        setIsSending(true);
        try {
            const batchSize = 10;
            for (let i = 0; i < selectedForwardGroups.length; i += batchSize) {
                const chunk = selectedForwardGroups.slice(i, i + batchSize);
                await Promise.all(chunk.map(async (targetId) => {
                    const targetGroup = myGroups.find(g => g.id === targetId);
                    const isTargetUnified = targetGroup?.isUnifiedChat || targetGroup?.chatEnabled;

                    for (const msg of forwardMessages) {
                        const forwardData = {
                            text: msg.text || "",
                            senderId: user.uid,
                            senderName: userProfile?.full_name || userProfile?.childName || "Участник",
                            senderRole: userProfile?.role || 'user',
                            senderVerification: userProfile?.verification || null,
                            timestamp: serverTimestamp(),
                            type: msg.type || 'text',
                            mediaUrl: msg.mediaUrl || null,
                            mediaType: msg.mediaType || null,
                            isForwarded: true,
                            forwardedFrom: {
                                groupName: groupData?.chatTitle || groupName,
                                senderName: msg.senderName,
                                senderRole: msg.senderRole,
                                senderVerification: msg.senderVerification
                            }
                        };

                        if (isTargetUnified) {
                            await addDoc(collection(db, 'chats', targetId, 'messages'), forwardData);
                        } else {
                            await addDoc(collection(db, 'group_messages'), {
                                ...forwardData,
                                groupId: targetId
                            });
                        }
                    }
                }));
            }
            setIsForwardModalOpen(false);
            setForwardMessages([]);
            setSelectedForwardGroups([]);
            alert(`Успешно переслано в ${selectedForwardGroups.length} групп!`);
        } catch (error: any) {
            console.error("Error forwarding message:", error);
            alert("Ошибка при пересылке.");
        } finally {
            setIsSending(false);
        }
    };

    const handleStartVideoCall = async () => {
        if (!chatId) return;
        const roomName = `sparta_live_${chatId.substring(0, 8)}`;
        setIsVideoCallOpen(true);

        if (isAdmin || isTrainer) {
            try {
                await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), {
                    text: `🎥 Онлайн-собрание «Sparta Live» начато! Присоединяйтесь: https://meet.jit.si/${roomName}`,
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || user.email,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: serverTimestamp(),
                    groupId: groupId || null,
                    type: 'system_notice',
                    isSystem: true
                });
            } catch (error) {
                console.error("Error sending call notice:", error);
            }
        }
    };

    // Save draft when message changes
    useEffect(() => {
        if (!chatId || newMessage === undefined) return;
        if (newMessage.trim()) {
            localStorage.setItem(`sparta_chat_draft_${chatId}`, newMessage);
        } else {
            localStorage.removeItem(`sparta_chat_draft_${chatId}`);
        }
    }, [newMessage, chatId]);

    // Load draft when switching chats
    useEffect(() => {
        if (!chatId) return;
        const draft = localStorage.getItem(`sparta_chat_draft_${chatId}`);
        if (draft) {
            setNewMessage(draft);
        } else {
            setNewMessage('');
        }
    }, [chatId]);

    const handleSendThreadMessage = async () => {
        if (!threadMessage.trim() || !filterThreadId || isThreadSending) return;

        setIsThreadSending(true);
        const parentMsg = messages.find(m => m.id === filterThreadId);

        try {
            const targetCollection = isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages');

            await addDoc(targetCollection, {
                text: threadMessage.trim(),
                senderId: user.uid,
                senderName: userProfile.full_name || userProfile.childName || user.displayName || user.email,
                senderPhoto: userProfile.photoURL || user.photoURL,
                senderRole: userProfile.role || 'ученик',
                senderVerification: userProfile.verification || { isVerified: false },
                timestamp: serverTimestamp(),
                replyToId: filterThreadId,
                replyToText: parentMsg?.text || (parentMsg?.mediaUrl ? "Медиа-файл" : "Сообщение"),
                replyToSender: parentMsg?.senderName || "Участник",
                replyToSenderRole: parentMsg?.senderRole,
                replyToSenderVerification: parentMsg?.senderVerification,
                groupId: groupId || null,
                chatId: chatId || null
            });

            setThreadMessage('');
        } catch (error) {
            console.error("Error sending thread message:", error);
        } finally {
            setIsThreadSending(false);
        }
    };

    const handleSendAnnouncement = async (title: string, text: string, priority: 'normal' | 'urgent', pin: boolean) => {
        if (!text.trim()) return;

        setIsSending(true);
        try {
            const senderName = userProfile?.full_name || userProfile?.childName || user.email || 'Тренер Спарта';
            const announcementData = {
                title,
                text: text.trim(),
                isAnnouncement: true,
                priority,
                isPinned: pin,
                senderId: user.uid,
                senderName,
                senderRole: userProfile?.role || 'trainer',
                senderVerification: userProfile?.verification || { isVerified: true, title: 'Тренерский состав' },
                senderAvatar: userProfile?.photoURL || null,
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp(),
                groupId: groupId || null,
                reactions: {}
            };

            const targetCol = isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages');
            const docRef = await addDoc(targetCol, announcementData);

            if (isUnifiedChat && chatId) {
                await updateDoc(doc(db, 'chats', chatId), {
                    lastMessage: `📢 ${title}: ${text.trim().slice(0, 40)}`,
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessageBy: user.uid,
                    ...(pin ? {
                        pinnedMessageId: docRef.id,
                        pinnedMessageText: text.trim(),
                        pinnedMessageSender: senderName
                    } : {})
                }).catch(() => {});
            }
        } catch (err) {
            console.error("Error sending announcement:", err);
            alert("Ошибка при отправке объявления");
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() && mediaFiles.length === 0) return;

        // Check if we are currently editing an existing message
        if (editingMessage) {
            setIsSending(true);
            try {
                const targetDoc = isUnifiedChat && chatId
                    ? doc(db, 'chats', chatId, 'messages', editingMessage.id)
                    : doc(db, 'group_messages', editingMessage.id);

                await updateDoc(targetDoc, {
                    text: newMessage.trim(),
                    isEdited: true,
                    editedAt: serverTimestamp()
                });

                setMessages((prev: any[]) => prev.map(m => m.id === editingMessage.id ? { ...m, text: newMessage.trim(), isEdited: true } : m));
                setEditingMessage(null);
                setNewMessage('');
            } catch (err) {
                console.error("Error updating edited message:", err);
            } finally {
                setIsSending(false);
            }
            return;
        }

        setIsSending(true);
        try {
            // If we have media, we upload and send each as a separate message
            if (mediaFiles.length > 0) {
                setIsUploading(true);
                setUploadProgress(10);

                // First, send the text message if it exists
                if (newMessage.trim()) {
                    await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), {
                        // ... existing text message data ...
                        text: newMessage,
                        senderId: user.uid,
                        senderName: userProfile?.full_name || userProfile?.childName || user.email,
                        senderRole: userProfile?.role || 'user',
                        senderVerification: userProfile?.verification || null,
                        senderAvatar: userProfile?.photoURL || null,
                        timestamp: serverTimestamp(),
                        groupId: groupId || null,
                        mediaUrl: null,
                        mediaType: null,
                        replyToId: replyTo?.id || null,
                        replyToText: replyTo?.text || null,
                        replyToSender: replyTo?.senderName || null,
                        reactions: {}
                    });
                }

                // Then send each media file
                let count = 0;
                for (const file of mediaFiles) {
                    const stepProgress = 10 + (count / mediaFiles.length) * 80;
                    setUploadProgress(stepProgress);

                    const path = isUnifiedChat ? `chats/${chatId}` : `messages/${groupId}`;
                    const fileName = `${path}/${Date.now()}_${file.name}`;
                    let publicUrl: string | null = null;

                    try {
                        const { data, error } = await supabase.storage
                            .from('chat-media')
                            .upload(fileName, file);

                        if (!error && data) {
                            const { data: publicData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
                            publicUrl = publicData?.publicUrl || null;
                        }
                    } catch (storageErr) {
                        console.warn("Supabase storage upload failed, utilizing Base64 fallback:", storageErr);
                    }

                    if (!publicUrl) {
                        try {
                            publicUrl = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(file);
                            });
                        } catch (e) {
                            publicUrl = URL.createObjectURL(file);
                        }
                    }

                    setUploadProgress(stepProgress + (80 / mediaFiles.length / 2));

                    const mType = file.type.startsWith('image') ? 'image' :
                        file.type.startsWith('video') ? 'video' : 'file';

                    const mediaMsgData: any = {
                        text: "", // No text for pure media messages
                        senderId: user.uid,
                        senderName: userProfile?.full_name || userProfile?.childName || user.email,
                        senderRole: userProfile?.role || 'user',
                        senderVerification: userProfile?.verification || null,
                        senderAvatar: userProfile?.photoURL || null,
                        timestamp: serverTimestamp(),
                        groupId: groupId || null,
                        mediaUrl: publicUrl,
                        mediaType: mType,
                        reactions: {}
                    };

                    try {
                        await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), mediaMsgData);
                    } catch (firestoreErr) {
                        console.warn("Firestore write failed for media message, appending to local state:", firestoreErr);
                        setMessages((prev: any[]) => [...prev, { ...mediaMsgData, id: `local-${Date.now()}` }]);
                    }

                    count++;
                    setUploadProgress(10 + (count / mediaFiles.length) * 80);

                    // Update last message metadata
                    if (isUnifiedChat && chatId) {
                        await updateDoc(doc(db, 'chats', chatId), {
                            lastMessage: mType === 'image' ? "🖼 Фото" : mType === 'video' ? "🎥 Видео" : "📄 Файл",
                            lastMessageAt: serverTimestamp(),
                            lastMessageBy: user.uid,
                            [`readBy.${user.uid}`]: serverTimestamp()
                        }).catch(() => { });
                    }
                }
                setUploadProgress(100);
            } else {
                // Just a regular text message
                const msgData: any = {
                    text: newMessage,
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || user.email,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    localTimestamp: Date.now(),
                    readBy: [user.uid],
                    groupId: groupId || null,
                    mediaUrl: null,
                    mediaType: null,
                    replyToId: replyTo?.id || null,
                    replyToText: replyTo?.text || null,
                    replyToSender: replyTo?.senderName || null,
                    reactions: {}
                };

                try {
                    await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), msgData);
                } catch (firestoreErr) {
                    console.warn("Firestore write failed for text message, appending to local state:", firestoreErr);
                    setMessages((prev: any[]) => [...prev, { ...msgData, id: `local-${Date.now()}` }]);
                }

                if (isUnifiedChat && chatId) {
                    await updateDoc(doc(db, 'chats', chatId), {
                        lastMessage: newMessage,
                        lastMessageAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        lastMessageBy: user.uid,
                        [`readBy.${user.uid}`]: serverTimestamp()
                    }).catch(() => { });
                }
            }

            setNewMessage('');
            setMediaFiles([]);
            setMediaPreviews([]);
            setReplyTo(null);
            setMentionSearch(null);
            updateTypingStatus(false);
        } catch (error) {
            console.error('Error sending message gracefully handled:', error);
        } finally {
            setIsSending(false);
            setIsUploading(false);
        }
    };

    const cyclePlaybackSpeed = () => {
        const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
        setPlaybackSpeed(nextSpeed);
        if (voiceAudioRef.current) {
            voiceAudioRef.current.playbackRate = nextSpeed;
        }
    };

    const toggleVoicePlay = (msgId: string, url: string) => {
        if (!url) return;
        if (isRecording) {
            setIsRecording(false);
        }
        try {
            if (playingVoiceId === msgId) {
                if (voiceAudioRef.current) {
                    try {
                        voiceAudioRef.current.pause();
                    } catch (e) {}
                }
                setPlayingVoiceId(null);
            } else {
                if (voiceAudioRef.current) {
                    try {
                        voiceAudioRef.current.pause();
                    } catch (e) {}
                }
                const audio = new Audio();
                audio.src = url;
                audio.playbackRate = playbackSpeed || 1;
                voiceAudioRef.current = audio;
                audio.onended = () => setPlayingVoiceId(null);
                audio.onerror = (e) => {
                    console.warn("Handled audio error:", e);
                    setPlayingVoiceId(null);
                };
                
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => setPlayingVoiceId(msgId))
                        .catch((err) => {
                            console.warn("Handled audio play rejection:", err);
                            setPlayingVoiceId(null);
                        });
                } else {
                    setPlayingVoiceId(msgId);
                }
            }
        } catch (err) {
            console.warn("Error in toggleVoicePlay:", err);
            setPlayingVoiceId(null);
        }
    };

    const handleSendAudioBlob = async (audioBlob: Blob, durationSeconds: number) => {
        setIsSending(true);
        let publicUrl: string | null = null;

        const fileName = `chat-voices/${Date.now()}_${user.uid}.webm`;

        // 1. Try uploading to 'voice-messages' bucket first
        try {
            const { data, error } = await supabase.storage
                .from('voice-messages')
                .upload(fileName, audioBlob, { contentType: 'audio/webm' });

            if (!error && data) {
                const { data: publicData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
                publicUrl = publicData?.publicUrl || null;
            }
        } catch (storageErr) {
            console.warn("Supabase storage upload failed, utilizing Base64 fallback:", storageErr);
        }

        // Fallback to Base64 or Blob URL if storage upload failed
        if (!publicUrl) {
            try {
                publicUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(audioBlob);
                });
            } catch (e) {
                publicUrl = URL.createObjectURL(audioBlob);
            }
        }

        const msgPayload: any = {
            text: '',
            senderId: user.uid,
            senderName: userProfile?.full_name || userProfile?.childName || user.email,
            senderRole: userProfile?.role || 'user',
            senderVerification: userProfile?.verification || null,
            senderAvatar: userProfile?.photoURL || null,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            readBy: [user.uid],
            groupId: groupId || null,
            mediaUrl: publicUrl,
            mediaType: 'voice',
            type: 'voice',
            duration: durationSeconds || 5,
            reactions: {}
        };

        try {
            const msgRef = await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), msgPayload);

            if (isUnifiedChat && chatId) {
                await updateDoc(doc(db, 'chats', chatId), {
                    lastMessage: '🎙️ Голосовое сообщение',
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessageBy: user.uid,
                    [`readBy.${user.uid}`]: serverTimestamp()
                }).catch(() => { });
            }
        } catch (err) {
            console.warn("Error adding voice message to database, placing in local state:", err);
            setMessages((prev: any[]) => [...prev, { ...msgPayload, id: `voice-${Date.now()}` }]);
        } finally {
            setIsRecording(false);
            setIsSending(false);
        }
    };

    const processIncomingFiles = useCallback((files: File[]) => {
        if (!files || files.length === 0) return;

        const newPreviews: MediaUploadItem[] = files.map((file: File) => {
            const sizeInMb = file.size / (1024 * 1024);
            const sizeFormatted = sizeInMb >= 1 ? `${sizeInMb.toFixed(1)} МБ` : `${Math.round(file.size / 1024)} КБ`;
            return {
                file,
                url: file.type.startsWith('image/') ? URL.createObjectURL(file) : file.type.startsWith('video/') ? URL.createObjectURL(file) : 'file',
                type: file.type.startsWith('image/') ? 'image' as const :
                    file.type.startsWith('video/') ? 'video' as const : 'file' as const,
                sizeFormatted
            };
        });

        setMediaFiles(prev => [...prev, ...files]);
        setMediaPreviews(prev => [...prev, ...newPreviews]);
        setIsMediaTrayOpen(true);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        processIncomingFiles(files);
        e.target.value = '';
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const ext = file.type.split('/')[1] || 'png';
                    const namedFile = new File([file], `sparta_media_${Date.now()}.${ext}`, { type: file.type });
                    pastedFiles.push(namedFile);
                }
            }
        }

        if (pastedFiles.length > 0) {
            e.preventDefault();
            processIncomingFiles(pastedFiles);
        }
    }, [processIncomingFiles]);

    const removeMediaFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => {
            const item = prev[index];
            if (item && item.url !== 'file') URL.revokeObjectURL(item.url);
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) setIsMediaTrayOpen(false);
            return updated;
        });
    };

    const replaceMediaFile = (index: number, newFile: File) => {
        setMediaFiles(prev => {
            const next = [...prev];
            next[index] = newFile;
            return next;
        });
        setMediaPreviews(prev => {
            const oldItem = prev[index];
            if (oldItem && oldItem.url !== 'file') URL.revokeObjectURL(oldItem.url);
            const previewUrl = URL.createObjectURL(newFile);
            const mType = newFile.type.startsWith('image') ? 'image' : newFile.type.startsWith('video') ? 'video' : 'file';
            const next = [...prev];
            next[index] = {
                file: newFile,
                url: previewUrl,
                type: mType,
                sizeFormatted: (newFile.size / (1024 * 1024)).toFixed(1) + ' МБ'
            };
            return next;
        });
    };

    const handleBatchSendMedia = async (caption: string, category: string) => {
        if (mediaFiles.length === 0) return;
        const filesToSend = [...mediaFiles];
        const captionToSend = caption.trim();
        const categoryToSend = category || 'general';

        // 1. Immediately close modal so user is back in the active chat
        setIsMediaTrayOpen(false);
        setMediaFiles([]);
        setMediaPreviews([]);
        setIsUploading(false);
        setUploadProgress(0);

        try {
            // 2. If there is a caption, send it to Firestore
            if (captionToSend) {
                const textMsgData: any = {
                    text: captionToSend,
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || user.email,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: serverTimestamp(),
                    groupId: groupId || null,
                    mediaUrl: null,
                    mediaType: null,
                    category: categoryToSend,
                    replyToId: replyTo?.id || null,
                    replyToText: replyTo?.text || null,
                    replyToSender: replyTo?.senderName || null,
                    reactions: {}
                };

                addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), textMsgData).catch(console.warn);
            }

            // 3. For each file, create an optimistic local message with instant preview and spinner directly in the chat bubble
            const optimisticEntries: { localId: string; file: File; mType: string; previewUrl: string }[] = [];

            for (const file of filesToSend) {
                const localId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                const previewUrl = URL.createObjectURL(file);
                const mType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file';

                const localMsg: any = {
                    id: localId,
                    text: "",
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || user.email,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: { seconds: Math.floor(Date.now() / 1000) },
                    localTimestamp: Date.now(),
                    groupId: groupId || null,
                    mediaUrl: previewUrl,
                    mediaType: mType,
                    fileName: file.name,
                    fileSize: file.size,
                    category: categoryToSend,
                    reactions: {},
                    isUploading: true,
                    uploadProgress: 20
                };

                optimisticEntries.push({ localId, file, mType, previewUrl });
                setMessages((prev: any[]) => [...prev, localMsg]);
            }

            // Scroll to bottom immediately so user sees the uploading photo in chat
            setTimeout(() => {
                scrollToBottom();
            }, 60);

            // 4. Background upload process
            for (const entry of optimisticEntries) {
                const { localId, file, mType, previewUrl } = entry;
                const path = isUnifiedChat ? `chats/${chatId}` : `messages/${groupId}`;
                const fileName = `${path}/${Date.now()}_${file.name}`;
                let publicUrl: string | null = null;

                try {
                    // Update upload progress in chat bubble
                    setMessages((prev: any[]) => prev.map(m => m.id === localId ? { ...m, uploadProgress: 45 } : m));

                    const { data, error } = await supabase.storage
                        .from('chat-media')
                        .upload(fileName, file);

                    if (!error && data) {
                        const { data: publicData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
                        publicUrl = publicData?.publicUrl || null;
                    }
                } catch (storageErr) {
                    console.warn("Supabase storage upload failed, utilizing Base64 fallback:", storageErr);
                }

                setMessages((prev: any[]) => prev.map(m => m.id === localId ? { ...m, uploadProgress: 85 } : m));

                if (!publicUrl) {
                    try {
                        publicUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                        });
                    } catch (e) {
                        publicUrl = previewUrl;
                    }
                }

                const mediaMsgData: any = {
                    text: "",
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || user.email,
                    senderRole: userProfile?.role || 'user',
                    senderVerification: userProfile?.verification || null,
                    senderAvatar: userProfile?.photoURL || null,
                    timestamp: serverTimestamp(),
                    groupId: groupId || null,
                    mediaUrl: publicUrl,
                    mediaType: mType,
                    fileName: file.name,
                    fileSize: file.size,
                    category: categoryToSend,
                    reactions: {}
                };

                try {
                    const docRef = await addDoc(isUnifiedChat && chatId ? collection(db, 'chats', chatId, 'messages') : collection(db, 'group_messages'), mediaMsgData);
                    setMessages((prev: any[]) => prev.map(m => m.id === localId ? { ...m, id: docRef.id, mediaUrl: publicUrl, isUploading: false, uploadProgress: 100 } : m));
                } catch (firestoreErr) {
                    console.warn("Firestore write failed for media message, keeping local:", firestoreErr);
                    setMessages((prev: any[]) => prev.map(m => m.id === localId ? { ...m, isUploading: false, uploadProgress: 100 } : m));
                }

                if (isUnifiedChat && chatId) {
                    updateDoc(doc(db, 'chats', chatId), {
                        lastMessage: mType === 'image' ? "🖼 Фото" : mType === 'video' ? "🎥 Видео" : "📄 Файл",
                        lastMessageAt: serverTimestamp(),
                        lastMessageBy: user.uid,
                        [`readBy.${user.uid}`]: serverTimestamp()
                    }).catch(() => { });
                }
            }
        } catch (err) {
            console.error("Batch media upload failed:", err);
        }
    };

    // Legacy recording system removed — AudioRecorder.tsx handles all recording with echo cancellation

    const handleTranscribe = async (msgId: string, audioUrl: string) => {
        if (isTranscribing[msgId]) return;

        setIsTranscribing(prev => ({ ...prev, [msgId]: true }));
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const transcribeRes = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!transcribeRes.ok) throw new Error('Transcription failed');

            const data = await transcribeRes.json();
            if (data.text) {
                setTranscriptions(prev => ({ ...prev, [msgId]: data.text }));

                // Optionally save to Firestore so it's persistent
                const msgRef = isUnifiedChat && chatId
                    ? doc(db, 'chats', chatId, 'messages', msgId)
                    : doc(db, 'group_messages', msgId);

                await updateDoc(msgRef, { transcription: data.text });
            }
        } catch (error) {
            console.error("Transcription error:", error);
        } finally {
            setIsTranscribing(prev => ({ ...prev, [msgId]: false }));
        }
    };


    const handleBatchDelete = async () => {
        if (selectedMessages.length === 0) return;
        if (!window.confirm(`Вы уверены, что хотите полностью удалить ${selectedMessages.length} сообщений?`)) return;

        if (playingVoiceId && selectedMessages.includes(playingVoiceId)) {
            if (voiceAudioRef.current) {
                try { voiceAudioRef.current.pause(); } catch (e) {}
            }
            setPlayingVoiceId(null);
        }

        const idsToDelete = [...selectedMessages];
        idsToDelete.forEach(id => deletedMsgIdsRef.current.add(id));

        // Save to localStorage
        try {
            const storageKey = `sparta_deleted_msgs_${chatId || groupId || 'global'}`;
            const stored = JSON.parse(safeLocalStorage.getItem(storageKey) || '[]');
            if (Array.isArray(stored)) {
                idsToDelete.forEach(id => {
                    if (!stored.includes(id)) stored.push(id);
                });
                safeLocalStorage.setItem(storageKey, JSON.stringify(stored));
            }
        } catch (e) {}

        // Optimistically remove from local state
        setMessages((prev: any[]) => prev.filter(m => !idsToDelete.includes(m.id)));
        setSelectedMessages([]);
        setIsSelectMode(false);

        try {
            for (const id of idsToDelete) {
                const targetDoc = isUnifiedChat && chatId
                    ? doc(db, 'chats', chatId, 'messages', id)
                    : doc(db, 'group_messages', id);

                // 1. Soft-delete first on Firestore
                await updateDoc(targetDoc, {
                    isDeleted: true,
                    text: '',
                    mediaUrl: null,
                    mediaType: null,
                    deletedAt: serverTimestamp()
                }).catch(() => {});

                // 2. Attempt hard delete as well
                await deleteDoc(targetDoc).catch(() => {});
            }
        } catch (err) {
            console.error("Error batch deleting:", err);
        }
    };

    const handleSendTrainingCard = async (session: any) => {
        try {
            // Helper to parse string date into a Timestamp-friendly Date
            const getSessionDate = (dateStr: string, timeStr: string) => {
                let d = new Date();
                if (dateStr === 'Сегодня') d = new Date();
                else if (dateStr === 'Завтра') d = addDays(new Date(), 1);
                else {
                    const parsed = parse(dateStr, 'dd.MM', new Date());
                    if (isValid(parsed)) d = parsed;
                }

                const [h, m] = timeStr.split(':').map(Number);
                d.setHours(h || 18, m || 0, 0, 0);
                return d;
            };

            const sessionDate = getSessionDate(session.date, session.time);

            const messageData = {
                senderId: user.uid,
                senderName: userProfile?.full_name || userProfile?.childName || user.email,
                senderRole: userProfile?.role || 'user',
                senderVerification: userProfile?.verification || null,
                senderAvatar: userProfile?.photoURL || null,
                text: `Тренировка: ${session.name || groupName}`,
                timestamp: serverTimestamp(),
                type: 'training_card',
                trainingData: {
                    id: session.id || Math.random().toString(36).substr(2, 9),
                    date: session.date || 'Сегодня',
                    time: session.time || '18:00',
                    location: session.location || 'Главный зал',
                    coach: session.coach || userProfile?.full_name || 'Тренер',
                    attendees: [],
                    capacity: session.capacity || 0,
                    deadlineHours: session.deadlineHours || 0,
                    startAt: Timestamp.fromDate(sessionDate)
                },
                reactions: {}
            };

            const messagesRef = isUnifiedChat && chatId
                ? collection(db, 'chats', chatId, 'messages')
                : collection(db, 'group_messages');

            if (!isUnifiedChat) {
                (messageData as any).groupId = groupId;
            }

            await addDoc(messagesRef, messageData);
            setIsScheduleModalOpen(false);
        } catch (error) {
            console.error("Error sending training card:", error);
        }
    };

    const handleToggleAttendance = async (msgId: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || !msg.trainingData) return;

        const attendees = msg.trainingData.attendees || [];
        const isAttending = attendees.includes(user.uid);
        const capacity = msg.trainingData.capacity || 0;
        const startAt = msg.trainingData.startAt;
        const deadlineHours = msg.trainingData.deadlineHours || 0;

        // Check for capacity
        if (!isAttending && capacity > 0 && attendees.length >= capacity) {
            alert("Все места на тренировку заняты");
            return;
        }

        // Check for deadline
        if (startAt) {
            const sessionDate = startAt.toDate();
            const deadlineDate = subHours(sessionDate, deadlineHours);
            if (isAfter(new Date(), deadlineDate)) {
                alert("Запись на эту тренировку уже закрыта");
                return;
            }
        }

        const newAttendees = isAttending
            ? attendees.filter((id: string) => id !== user.uid)
            : [...attendees, user.uid];

        try {
            const msgRef = isUnifiedChat && chatId
                ? doc(db, 'chats', chatId, 'messages', msgId)
                : doc(db, 'group_messages', msgId);

            await updateDoc(msgRef, {
                'trainingData.attendees': newAttendees
            });
        } catch (error) {
            console.error("Error updating attendance:", error);
        }
    };

    const handleRateTraining = async (msgId: string, rating: number) => {
        try {
            const msgRef = isUnifiedChat && chatId
                ? doc(db, 'chats', chatId, 'messages', msgId)
                : doc(db, 'group_messages', msgId);

            await updateDoc(msgRef, {
                [`trainingData.ratings.${user.uid}`]: rating
            });
            alert("Спасибо за отзыв! 🥊");
        } catch (error) {
            console.error("Error saving rating:", error);
        }
    };




    const EMOJI_3D_MAP: Record<string, string> = {
        '❤️': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Heart/3D/heart_3d.png',
        '🔥': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png',
        '👍': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Thumbs%20Up/3D/thumbs_up_3d_default.png',
        '😂': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20Tears%20of%20Joy/3D/face_with_tears_of_joy_3d.png',
        '😮': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20Open%20Mouth/3D/face_with_open_mouth_3d.png',
        '🎉': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Party%20Popper/3D/party_popper_3d.png',
        '🏆': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png',
        '🥊': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Boxing%20Glove/3D/boxing_glove_3d.png',
        '🥋': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Martial%20Arts%20Uniform/3D/martial_arts_uniform_3d.png',
        '💪': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Flexed%20Biceps/3D/flexed_biceps_3d_default.png',
        '🚀': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png',
        '✨': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sparkles/3D/sparkles_3d.png',
        '💯': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hundred%20Points/3D/hundred_points_3d.png',
        '👏': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Clapping%20Hands/3D/clapping_hands_3d_default.png',
        '🙌': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Raising%20Hands/3D/raising_hands_3d_default.png',
        '👀': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Eyes/3D/eyes_3d.png',
        '😍': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20Face%20with%20Heart-Eyes/3D/smiling_face_with_heart-eyes_3d.png',
        '🤩': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Star-Struck/3D/star-struck_3d.png',
        '🥳': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Partying%20Face/3D/partying_face_3d.png',
        '😉': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Winking%20Face/3D/winking_face_3d.png',
        '😎': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20Face%20with%20Sunglasses/3D/smiling_face_with_sunglasses_3d.png',
        '🤔': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Thinking%20Face/3D/thinking_face_3d.png',
        '😱': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20Screaming%20in%20Fear/3D/face_screaming_in_fear_3d.png'
    };

    const emojiToHex = (emoji: string) => {
        return [...emoji].map(char => char.codePointAt(0)?.toString(16)).join('_');
    };

    const getEmojiLottieUrl = (emoji: string) => {
        const hex = emojiToHex(emoji);
        return `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/lottie.json`;
    };

    const renderRichText = (text: string, highlightQuery?: string) => {
        if (!text) return null;

        const highlightSubtext = (str: string, keyPrefix: string) => {
            if (!highlightQuery || !highlightQuery.trim()) return str;
            const q = highlightQuery.trim();
            const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${esc})`, 'gi');
            const parts = str.split(regex);
            if (parts.length <= 1) return str;
            return (
                <>
                    {parts.map((part, idx) =>
                        part.toLowerCase() === q.toLowerCase() ? (
                            <mark
                                key={`${keyPrefix}-${idx}`}
                                className="bg-sparta-gold/30 text-sparta-gold font-black px-1 py-0.5 rounded border border-sparta-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                            >
                                {part}
                            </mark>
                        ) : (
                            part
                        )
                    )}
                </>
            );
        };

        // Regex to match emojis
        const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

        // Check if text consists ONLY of emojis and whitespace
        const cleanText = text.trim();
        const emojiMatches = cleanText.match(emojiRegex);
        const isEmojiOnly = emojiMatches && emojiMatches.join('') === cleanText.replace(/\s/g, '') && emojiMatches.length <= 3;

        const subStrings = text.split(emojiRegex);

        return (
            <div className={`flex flex-wrap items-center ${isEmojiOnly ? 'gap-2 py-2' : ''}`}>
                {subStrings.map((str, i) => {
                    if (emojiRegex.test(str)) {
                        const lottieUrl = getEmojiLottieUrl(str);
                        const static3dUrl = EMOJI_3D_MAP[str];

                        return (
                            <motion.div
                                key={i}
                                initial={isEmojiOnly ? { scale: 0.5, opacity: 0 } : {}}
                                animate={isEmojiOnly ? { scale: [1, 1.1, 1], opacity: 1 } : { opacity: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="inline-block relative"
                            >
                                <div className={isEmojiOnly ? 'w-20 h-20 relative' : 'w-7 h-7 mx-0.5 relative'}>
                                    <AnimatedEmoji
                                        url={lottieUrl}
                                        className="w-full h-full relative z-10"
                                    />
                                    {/* Fallback to static or standard emoji if Lottie fails/loading */}
                                    <div className="absolute inset-0 flex items-center justify-center -z-0">
                                        {static3dUrl ? (
                                            <img
                                                src={static3dUrl}
                                                alt={str}
                                                className={`w-full h-full object-contain ${isEmojiOnly ? 'opacity-100' : 'opacity-40'}`}
                                            />
                                        ) : (
                                            <span className={isEmojiOnly ? 'text-4xl opacity-100' : 'text-sm opacity-40'}>{str}</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    }
                    return str ? <span key={i} className={isEmojiOnly ? 'hidden' : ''}>{highlightSubtext(str, `txt-${i}`)}</span> : null;
                })}
            </div>
        );
    };

    const [viewportHeight, setViewportHeight] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleResize = () => {
            if (window.visualViewport) {
                setViewportHeight(window.visualViewport.height);
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, []);

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };


    return (
        <div
            style={viewportHeight && typeof window !== 'undefined' && window.innerWidth < 768 ? { height: `${viewportHeight}px` } : undefined}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDraggingFile) setIsDraggingFile(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFile(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                }
            }}
            className="fixed inset-0 z-[999] md:relative md:z-auto flex flex-col h-[100dvh] md:h-full w-full bg-[#0c0c0c] border-0 md:border md:border-white/5 md:rounded-3xl overflow-hidden shadow-2xl messenger-theme"
        >
            {/* Drag & Drop File Overlay */}
            <AnimatePresence>
                {isDraggingFile && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-dashed border-sparta-gold rounded-3xl m-2 pointer-events-none"
                    >
                        <div className="w-20 h-20 rounded-3xl bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/40 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(212,175,55,0.4)] animate-bounce">
                            <UploadCloud size={42} />
                        </div>
                        <h3 className="text-xl font-black font-russo text-white uppercase tracking-wider mb-2 text-center">
                            Перетащите файлы сюда
                        </h3>
                        <p className="text-xs text-white/60 text-center max-w-sm">
                            Отпустите фото, видео или документы для быстрой отправки в чат
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pinned Message Banner */}
            {pinnedMessage && (
                <div className="relative z-20 bg-sparta-gold/15 border-b border-sparta-gold/30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 shadow-md">
                    <div
                        className="flex items-center gap-3 overflow-hidden cursor-pointer group/pin hover:opacity-85 transition-all flex-1"
                        onClick={() => scrollToMessage(pinnedMessage.id)}
                    >
                        <div className="w-7 h-7 rounded-lg bg-sparta-gold/20 flex items-center justify-center text-sparta-gold shrink-0 border border-sparta-gold/30 group-hover/pin:scale-105 transition-transform">
                            <Pin size={13} className="rotate-45" />
                        </div>
                        <div className="overflow-hidden min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sparta-gold flex items-center gap-1.5">
                                <span>{chatId?.startsWith('saved_') || groupData?.type === 'saved' ? '📌 Закрепленная заметка' : '📌 Закрепленное сообщение'}</span>
                                <span className="text-[8px] font-bold text-white/40 lowercase">(нажмите для перехода)</span>
                            </p>
                            <p className="text-[11px] text-white/90 truncate font-medium">{pinnedMessage.text || (pinnedMessage.mediaUrl ? "Медиа-файл" : "Сообщение")}</p>
                        </div>
                    </div>
                    {(chatId?.startsWith('saved_') || groupData?.type === 'saved' || isAdmin || isTrainer || isOwner) && (
                        <button onClick={handleUnpinMessage} className="p-1.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors" title="Открепить">
                            <XIcon size={14} />
                        </button>
                    )}
                </div>
            )}

            <div className={`h-16 shrink-0 bg-[#0c0c0c] border-b border-white/5 flex items-center justify-between px-3 sm:px-6 relative z-20 transition-all ${filterThreadId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div
                    className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 cursor-pointer group/header hover:opacity-80 transition-all"
                    onClick={() => {
                        const isSaved = groupData?.type === 'saved' || chatId?.startsWith('saved_');
                        if (isSaved) {
                            setSelectedUserProfile(null);
                            setShowProfile(true);
                            return;
                        }

                        const isGroupChat = groupData?.type === 'team' || groupData?.type === 'group' || groupData?.type === 'channel' || !!groupData?.groupId || (groupName || '').toLowerCase().startsWith('гр.') || (groupName || '').toLowerCase().includes('команда');
                        const isDirect = !isGroupChat && Boolean(
                            groupData?.isPrivate === true ||
                            groupData?.type === 'private' ||
                            groupData?.type === 'direct' ||
                            groupData?.type === 'parent' ||
                            groupData?.type === 'child' ||
                            groupData?.coachId ||
                            (groupName || '').toLowerCase().includes('тренер') ||
                            (Array.isArray(groupData?.participants) && groupData.participants.length === 2)
                        );
                        
                        if (isDirect) {
                            const other = groupMembers.find(m => m.id !== user.uid);
                            if (other) {
                                setSelectedUserProfile(other);
                            } else {
                                const isCoachName = (groupName || '').toLowerCase().includes('тренер') || !!groupData?.coachId;
                                const isParentRole = userProfile?.role === 'parent';
                                const otherRole = isParentRole ? 'student' : (userProfile?.role === 'student' ? 'parent' : (isCoachName ? 'trainer' : 'student'));
                                setSelectedUserProfile({
                                    id: groupData?.coachId || groupData?.participants?.find((id: string) => id !== user.uid),
                                    full_name: groupName || 'Собеседник',
                                    role: otherRole,
                                    photoURL: groupData?.chatAvatarUrl,
                                    license: isCoachName ? 'Лицензия РФС / UEFA B' : undefined,
                                    experienceYears: isCoachName ? '8 лет' : undefined,
                                    position: !isCoachName ? 'Нападающий ⚡' : undefined,
                                    playerNumber: !isCoachName ? 10 : undefined
                                });
                            }
                        } else {
                            setSelectedUserProfile(null);
                        }
                        setShowProfile(true);
                    }}
                >
                    {onBack && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onBack();
                            }}
                            className="md:hidden flex items-center gap-1 px-2.5 py-2 bg-sparta-gold/10 border border-sparta-gold/30 rounded-xl text-sparta-gold hover:bg-sparta-gold hover:text-black transition-all mr-1.5 shrink-0"
                            title="Вернуться ко всем чатам"
                        >
                            <ChevronLeft size={18} />
                            <span className="text-[10px] font-black uppercase tracking-wider font-russo">Чаты</span>
                        </button>
                    )}
                    <div className="shrink-0">
                        {(() => {
                            const isSaved = groupData?.type === 'saved' || chatId?.startsWith('saved_');
                            if (isSaved) {
                                return (
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-sparta-gold to-yellow-600 flex items-center justify-center text-black shadow-lg shadow-sparta-gold/20 shrink-0">
                                        <Bookmark size={20} className="fill-black" />
                                    </div>
                                );
                            }
                            const isGroupChat = groupData?.type === 'team' || groupData?.type === 'group' || groupData?.type === 'channel' || !!groupData?.groupId || (groupName || '').toLowerCase().startsWith('гр.') || (groupName || '').toLowerCase().includes('команда');
                            const isDirect = !isGroupChat && Boolean(
                                groupData?.isPrivate === true ||
                                groupData?.type === 'private' ||
                                groupData?.type === 'direct' ||
                                groupData?.type === 'parent' ||
                                groupData?.type === 'child' ||
                                (Array.isArray(groupData?.participants) && groupData.participants.length === 2)
                            );
                            const other = isDirect ? (groupMembers.find(m => m.id !== user.uid) || null) : null;
                            const displayAvatar = isDirect && other ? (other.photoURL || other.avatarUrl || groupData?.chatAvatarUrl) : groupData?.chatAvatarUrl;
                            const otherName = other ? (other.childName || other.full_name || other.name || other.email) : null;
                            const title = isDirect && otherName ? otherName : (groupData?.chatTitle || groupName || 'Чат Спарта');

                            return (
                                <SpartaAvatar
                                    src={displayAvatar}
                                    name={title}
                                    isGroup={!isDirect}
                                    isCoach={other?.role === 'coach' || other?.role === 'trainer' || (title.toLowerCase().includes('тренер'))}
                                    isAdmin={groupData?.type === 'channel' || title.toLowerCase().includes('администрация')}
                                    size="md"
                                    className="rounded-2xl"
                                />
                            );
                        })()}
                    </div>
                    <div className="min-w-0 flex-1 max-w-[100px] xs:max-w-[150px] sm:max-w-none">
                        {(() => {
                            const isSaved = groupData?.type === 'saved' || chatId?.startsWith('saved_');
                            const isGroupChat = groupData?.type === 'team' || groupData?.type === 'group' || groupData?.type === 'channel' || !!groupData?.groupId || (groupName || '').toLowerCase().startsWith('гр.') || (groupName || '').toLowerCase().includes('команда');
                            const isDirect = !isGroupChat && Boolean(
                                groupData?.isPrivate === true ||
                                groupData?.type === 'private' ||
                                groupData?.type === 'direct' ||
                                groupData?.type === 'parent' ||
                                groupData?.type === 'child' ||
                                (Array.isArray(groupData?.participants) && groupData.participants.length === 2)
                            );
                            const other = isDirect ? (groupMembers.find(m => m.id !== user.uid) || null) : null;
                            const otherName = other ? (other.childName || other.full_name || other.name || other.email) : null;
                            const title = isSaved ? '⭐️ Избранное' : (isDirect && otherName ? otherName : (groupData?.chatTitle || groupName || 'Групповой чат'));

                            return (
                                <>
                                    <h3 className="text-sm sm:text-base font-russo text-white uppercase tracking-tight group-hover/header:text-sparta-gold transition-colors truncate leading-tight">
                                        {title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                                        {isSaved ? (
                                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-sparta-gold truncate">
                                                Личное хранилище заметок и файлов
                                            </p>
                                        ) : (
                                            <>
                                                {groupData?.topic && (
                                                    <>
                                                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-sparta-gold truncate max-w-[80px] sm:max-w-none">
                                                            {groupData.topic}
                                                        </p>
                                                        <span className="text-white/10 text-[10px]">•</span>
                                                    </>
                                                )}
                                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/30 truncate">
                                                    {messages.length} сообщ.
                                                </p>
                                                <span className="text-white/10 text-[10px] hidden sm:inline">•</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 hidden sm:inline">
                                                    {isDirect ? 'Профиль собеседника' : 'Участники и медиа'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="block">
                        <WeatherWidget />
                    </div>
                    <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className={`p-2 sm:p-3 border rounded-2xl transition-all ${isSearchExpanded ? 'bg-sparta-gold border-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-white/5 border-white/10 text-muted hover:text-sparta-gold hover:border-sparta-gold/50'}`}
                        title="Поиск по сообщениям"
                    >
                        <Search size={16} className="sm:w-5 sm:h-5" />
                    </button>
                    {/* Video Meeting Button: strictly for Coach, Trainer, Admin, Director, Developer */}
                    {(isAdmin || isTrainer || ['coach', 'trainer', 'admin', 'director', 'developer', 'staff'].includes((userProfile?.role || '').toLowerCase())) && (
                        <button
                            onClick={handleStartVideoCall}
                            className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-2xl text-muted hover:text-sparta-gold hover:border-sparta-gold/50 transition-all hidden sm:block"
                            title="Sparta Live - Видеовстреча"
                        >
                            <VideoIcon size={20} />
                        </button>
                    )}

                    {/* Header Context Menu (⋮) strictly for Coach / Trainer / Admin / Director / Developer (hidden for Student & Parent) */}
                    {!['student', 'parent', 'kid', 'child'].includes((userProfile?.role || '').toLowerCase()) &&
                        (isAdmin || isTrainer || ['coach', 'trainer', 'admin', 'director', 'developer', 'staff'].includes((userProfile?.role || '').toLowerCase())) && (
                        <div className="relative">
                            <button
                                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                className={`p-2 sm:p-3 border rounded-2xl transition-all ${isHeaderMenuOpen ? 'bg-sparta-gold border-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-white/5 border-white/10 text-muted hover:text-sparta-gold hover:border-sparta-gold/50'}`}
                                title="Действия чата"
                            >
                                <MoreVertical size={16} className="sm:w-5 sm:h-5" />
                            </button>

                            <AnimatePresence>
                                {isHeaderMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40 bg-transparent"
                                            onClick={() => setIsHeaderMenuOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                            className="absolute right-0 top-full mt-2 z-50 bg-[#121214]/95 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-2xl min-w-[210px] space-y-1"
                                        >
                                            {(isTrainer || isAdmin) && (
                                                <button
                                                    onClick={() => {
                                                        setIsAnnouncementModalOpen(true);
                                                        setIsHeaderMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left text-xs font-medium group"
                                                >
                                                    <Megaphone size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                                    <span>📢 Объявление тренера</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setIsPollModalOpen(true);
                                                    setIsHeaderMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left text-xs font-medium group"
                                            >
                                                <BarChart2 size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                                <span>Создать опрос</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsScheduleModalOpen(true);
                                                    setIsHeaderMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left text-xs font-medium group"
                                            >
                                                <Clock size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                                <span>Запланировать тренировку</span>
                                            </button>

                                            {isAdmin && isUnifiedChat && (
                                                <button
                                                    onClick={() => {
                                                        setIsEditingChat(true);
                                                        setIsHeaderMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left text-xs font-medium group"
                                                >
                                                    <Settings size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                                    <span>Настройки чата</span>
                                                </button>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Ultra-Compact Liquid Glass Smart Search Bar */}
            <AnimatePresence>
                {isSearchExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#0e0e12]/95 backdrop-blur-2xl border-b border-white/10 shrink-0 flex flex-col px-3.5 py-2.5 sm:px-6 gap-2 z-30 shadow-2xl relative"
                    >
                        {/* 1. Main Search Row */}
                        <div className="flex items-center gap-2 w-full">
                            <div className="relative flex-1 group flex items-center">
                                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${chatSearchQuery || searchDate ? 'text-sparta-gold' : 'text-white/30'}`} size={16} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Поиск по чату, автору, расписанию..."
                                    value={chatSearchQuery}
                                    onChange={(e) => {
                                        setChatSearchQuery(e.target.value);
                                        setShowResultsDrawer(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setIsSearchExpanded(false);
                                            setChatSearchQuery('');
                                            setSearchFilter('all');
                                            setSearchDate('');
                                            setShowResultsDrawer(false);
                                        } else if (e.key === 'Enter') {
                                            handleNextMatch();
                                        }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2 pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-all font-medium"
                                />
                                {chatSearchQuery && (
                                    <button
                                        onClick={() => setChatSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                    >
                                        <XIcon size={14} />
                                    </button>
                                )}
                            </div>

                            {/* 📅 Фирменный календарь Спарта */}
                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                    className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                                        searchDate
                                            ? 'bg-sparta-gold text-black border-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                            : 'bg-white/5 text-white/80 border-white/10 hover:border-sparta-gold/40 hover:text-sparta-gold'
                                    }`}
                                    title="Фирменный календарь Спарта"
                                >
                                    <Calendar size={14} className={searchDate ? 'text-black' : 'text-sparta-gold'} />
                                    <span className="hidden sm:inline text-[11px]">
                                        {searchDate ? format(new Date(searchDate), 'd MMM', { locale: ru }) : 'Дата'}
                                    </span>
                                </button>

                                <SpartaDatePickerPopover
                                    isOpen={isDatePickerOpen}
                                    selectedDate={searchDate}
                                    onSelectDate={(d) => {
                                        setSearchDate(d);
                                        setShowResultsDrawer(true);
                                    }}
                                    onClose={() => setIsDatePickerOpen(false)}
                                    messageDates={messageDates}
                                    trainingDays={groupTrainingDays}
                                    messageCountByDate={messageCountByDate}
                                />
                            </div>

                            {/* Match Counter & Navigation */}
                            {(chatSearchQuery.trim() || searchFilter !== 'all' || searchDate) && (
                                <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl shrink-0">
                                    <span className="text-[11px] font-mono font-bold text-sparta-gold">
                                        {matchedMessages.length > 0 ? `${currentMatchIndex + 1}/${matchedMessages.length}` : '0'}
                                    </span>
                                    <button
                                        onClick={handlePrevMatch}
                                        disabled={matchedMessages.length === 0}
                                        className="p-0.5 hover:bg-white/10 text-white/60 hover:text-sparta-gold disabled:opacity-20 rounded transition-all"
                                        title="Предыдущее совпадение"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={handleNextMatch}
                                        disabled={matchedMessages.length === 0}
                                        className="p-0.5 hover:bg-white/10 text-white/60 hover:text-sparta-gold disabled:opacity-20 rounded transition-all"
                                        title="Следующее совпадение"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => {
                                    setIsSearchExpanded(false);
                                    setChatSearchQuery('');
                                    setSearchFilter('all');
                                    setSearchDate('');
                                    setShowResultsDrawer(false);
                                }}
                                className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all text-xs font-bold shrink-0 active:scale-95"
                                title="Закрыть поиск (Esc)"
                            >
                                <XIcon size={16} />
                            </button>
                        </div>

                        {/* 2. Smart Quick Chips (Horizontal Scrollable with Fade Indicator) */}
                        <div className="relative w-full">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-8 scroll-smooth">
                                {searchDate && (
                                    <button
                                        onClick={() => setSearchDate('')}
                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sparta-gold text-black border border-sparta-gold shadow-md flex items-center gap-1 shrink-0 animate-fadeIn active:scale-95"
                                        title="Сбросить фильтр по дате"
                                    >
                                        <span>📅 {format(new Date(searchDate), 'd MMM', { locale: ru })}</span>
                                        <XIcon size={12} className="hover:opacity-70" />
                                    </button>
                                )}

                                {[
                                    { id: 'all', label: 'Все', icon: '⭐️' },
                                    { id: 'schedule', label: 'Расписание', icon: '📅' },
                                    { id: 'important', label: 'Важное', icon: '📌' },
                                    { id: 'coach', label: 'Тренер', icon: '👑' },
                                    { id: 'polls', label: 'Опросы', icon: '📊' },
                                    { id: 'media', label: 'Фото/Медиа', icon: '📸' },
                                    { id: 'links', label: 'Ссылки', icon: '🔗' },
                                ].map(chip => {
                                    const isActive = searchFilter === chip.id;
                                    return (
                                        <button
                                            key={chip.id}
                                            onClick={(e) => {
                                                setSearchFilter(chip.id as any);
                                                setShowResultsDrawer(true);
                                                e.currentTarget.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
                                            }}
                                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold tracking-wide transition-all shrink-0 flex items-center gap-1.5 border active:scale-95 ${
                                                isActive
                                                    ? 'bg-sparta-gold text-black font-bold border-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.35)] scale-100'
                                                    : 'bg-white/5 text-white/70 border-white/5 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-xs">{chip.icon}</span>
                                            <span>{chip.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right edge scroll fade hint on mobile */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e12] to-transparent pointer-events-none" />
                        </div>

                        {/* 3. Dropdown Matches Preview Drawer */}
                        {showResultsDrawer && (chatSearchQuery.trim() || searchFilter !== 'all' || searchDate) && matchedMessages.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1 bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar shadow-2xl"
                            >
                                <div className="px-3 py-1.5 bg-white/[0.03] flex items-center justify-between text-[9px] font-mono text-white/40 uppercase">
                                    <span>Найдено совпадений: {matchedMessages.length}</span>
                                    <button
                                        onClick={() => setShowResultsDrawer(false)}
                                        className="hover:text-white transition-colors"
                                    >
                                        Скрыть список ✕
                                    </button>
                                </div>
                                {searchFilter === 'media' ? (
                                    <div className="p-3 space-y-4 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar">
                                        {groupedMediaByMonth.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-white/40 font-mono">
                                                В этом чате пока нет медиафайлов
                                            </div>
                                        ) : (
                                            groupedMediaByMonth.map(group => (
                                                <div key={group.monthKey} className="space-y-2">
                                                    <div className="flex items-center justify-between text-[11px] font-russo uppercase text-sparta-gold/90 px-1 border-b border-white/5 pb-1">
                                                        <span>{group.monthLabel}</span>
                                                        <span className="text-[10px] font-mono text-white/40">{group.items.length} фото</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                        {group.items.map(m => (
                                                            <div
                                                                key={m.id}
                                                                onClick={() => {
                                                                    setSelectedMediaForLightbox({
                                                                        id: m.id,
                                                                        mediaUrl: m.mediaUrl,
                                                                        mediaType: m.mediaType || 'image',
                                                                        senderName: m.senderName,
                                                                        senderRole: m.senderRole,
                                                                        senderAvatar: m.senderAvatar || m.senderPhoto,
                                                                        timestamp: m.timestamp,
                                                                        text: m.text,
                                                                        category: m.category
                                                                    });
                                                                }}
                                                                className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-sparta-gold/60 cursor-pointer transition-all active:scale-95 shadow-md"
                                                                title={`Отправил: ${m.senderName || 'Участник'}`}
                                                            >
                                                                <SpartaProgressiveImage
                                                                    src={m.mediaUrl}
                                                                    alt={m.text || 'Медиа'}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                                                                    <span className="text-[9px] text-white font-bold truncate leading-tight">
                                                                        {m.senderName || 'Участник'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    matchedMessages.slice(0, 10).map((m, idx) => {
                                        const isCurrent = idx === currentMatchIndex;
                                        const mTime = m.timestamp?.seconds
                                            ? format(new Date(m.timestamp.seconds * 1000), 'd MMM HH:mm', { locale: ru })
                                            : '';
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setCurrentMatchIndex(idx);
                                                    scrollToMessage(m.id);
                                                }}
                                                className={`w-full p-2.5 text-left flex items-start justify-between gap-3 hover:bg-white/10 transition-colors ${
                                                    isCurrent ? 'bg-sparta-gold/15 border-l-2 border-sparta-gold' : ''
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[11px] font-bold text-sparta-gold truncate">
                                                            {m.senderName || 'Участник'}
                                                        </span>
                                                        {m.type === 'schedule_announcement' && (
                                                            <span className="text-[8px] bg-sparta-gold/20 text-sparta-gold px-1 rounded font-bold">РАСПИСАНИЕ</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-white/80 line-clamp-1 truncate font-medium">
                                                        {m.text || (m.mediaUrl ? '📸 Фото/Медиа' : 'Сообщение')}
                                                    </p>
                                                </div>
                                                <span className="text-[9px] font-mono text-white/40 shrink-0 mt-0.5">
                                                    {mTime}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Chat Modal */}
            <AnimatePresence>
                {isEditingChat && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface-dark border border-card-border rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-russo text-white uppercase">Настройки чата</h3>
                                <button onClick={() => setIsEditingChat(false)} className="text-white/20 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Название</label>
                                    <input
                                        type="text"
                                        value={editChatName}
                                        onChange={(e) => setEditChatName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Аватар (URL)</label>
                                    <input
                                        type="text"
                                        value={editChatAvatar}
                                        onChange={(e) => setEditChatAvatar(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Тема чата</label>
                                    <input
                                        type="text"
                                        value={editChatTopic}
                                        onChange={(e) => setEditChatTopic(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Описание</label>
                                    <textarea
                                        value={editChatDescription}
                                        onChange={(e) => setEditChatDescription(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all min-h-[80px]"
                                    />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button onClick={() => setIsEditingChat(false)} className="flex-1 px-4 py-3 bg-white/5 text-muted rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Отмена</button>
                                    <button onClick={handleUpdateChatMetadata} className="flex-1 px-4 py-3 bg-sparta-gold text-black rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-sparta-gold/20 hover:bg-sparta-gold/80 transition-all">Сохранить</button>
                                </div>

                                {/* Participant Manager Trigger */}
                                {isAdmin && (
                                    <div className="pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                setShowParticipantManager(true);
                                            }}
                                            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-sparta-gold/20 rounded-lg text-sparta-gold group-hover:scale-110 transition-transform">
                                                    <Users size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Участники</p>
                                                    <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Добавить или удалить</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-white/20" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Participant Manager Modal */}
            <AnimatePresence>
                {showParticipantManager && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-surface-dark border border-card-border rounded-[32px] p-8 w-full max-w-md shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-sparta-gold/20 rounded-2xl text-sparta-gold">
                                        <Users size={24} />
                                    </div>
                                    <h3 className="text-xl font-russo text-white uppercase tracking-tight">Участники чата</h3>
                                </div>
                                <button onClick={() => setShowParticipantManager(false)} className="text-white/20 hover:text-white transition-colors">
                                    <XIcon size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* User Search */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 block ml-1">Добавить участника</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Поиск по имени или email..."
                                            value={userSearchQuery}
                                            onChange={(e) => handleSearchUsers(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all placeholder:text-white/10"
                                        />
                                        {isSearchingUsers && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Search Results */}
                                    <AnimatePresence>
                                        {userSearchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-2 bg-black/40 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-2xl"
                                            >
                                                {userSearchResults.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => handleAddParticipant(u.id)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-white font-bold">{u.childName || `${u.childFirstName || ''} ${u.childLastName || ''}`.trim() || u.email}</p>
                                                                <p className="text-muted text-xs">{u.email}</p>
                                                            </div>
                                                            <Plus size={16} className="text-sparta-gold/50 group-hover:text-sparta-gold transition-colors" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Current Participants (Simple List) */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 block ml-1">Текущие участники</label>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {groupData?.participants?.map((pId: string) => (
                                            <ParticipantItem
                                                key={pId}
                                                uid={pId}
                                                currentUserId={user.uid}
                                                isAdmin={isAdmin}
                                                onStartChat={handleStartPrivateChat}
                                                onRemove={(uid) => {
                                                    if (window.confirm("Удалить участника?")) {
                                                        updateDoc(doc(db, 'chats', chatId!), {
                                                            participants: groupData.participants.filter((id: string) => id !== uid)
                                                        });
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Messages List */}
            <div className="flex flex-1 overflow-hidden relative h-full min-h-0">
                {/* Main Message List */}
                <div className={`flex-1 flex flex-col transition-all duration-500 min-w-0 min-h-0 ${filterThreadId ? 'opacity-40 scale-95 pointer-events-none' : ''}`}>
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 scrollbar-hide relative" style={{ backgroundImage: 'var(--messenger-chat-bg)', backgroundRepeat: 'repeat' }}>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <RotateCcw size={40} className="text-sparta-gold animate-spin opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Загрузка сообщений...</p>
                            </div>
                        ) : messages.length === 0 ? (
                            (groupData?.type === 'saved' || chatId?.startsWith('saved_')) ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 max-w-sm mx-auto">
                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-sparta-gold to-yellow-600 flex items-center justify-center text-black shadow-xl shadow-sparta-gold/25 mb-4">
                                        <Bookmark size={32} className="fill-black" />
                                    </div>
                                    <h4 className="text-lg font-black font-russo uppercase text-white tracking-wide mb-2">Ваше Избранное</h4>
                                    <p className="text-xs text-white/60 leading-relaxed mb-4">
                                        Сюда можно пересылать фото, видео, важные сообщения и файлы из других чатов или писать личные заметки.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-sparta-gold">
                                        <Shield size={12} /> Доступно только вам
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                                    <MessageSquare size={64} className="mb-4 text-sparta-gold" />
                                    <p className="text-sm font-russo uppercase tracking-widest text-white">Здесь пока пусто</p>
                                    <p className="text-[10px] mt-2 max-w-[200px] uppercase font-bold tracking-tighter">Будьте первым, кто напишет в чат группы!</p>
                                </div>
                            )
                        ) : (
                            <>
                                {/* The old filterThreadId header is removed from here */}
                                <motion.div layout className="space-y-4">
                                    <AnimatePresence initial={false} mode="popLayout">
                                        {groupedMessages
                                            .filter(msg => {
                                                if (msg.isDeleted) return false;

                                                if (searchFilter === 'media') {
                                                    const isMedia = Boolean(msg.mediaUrl || msg.mediaType || msg.type === 'voice' || msg.type === 'media_group');
                                                    if (!isMedia) return false;
                                                } else if (searchFilter === 'links') {
                                                    const hasLink = Boolean(msg.text && /(https?:\/\/|www\.)[^\s]+/i.test(msg.text));
                                                    if (!hasLink) return false;
                                                }

                                                if (chatSearchQuery.trim()) {
                                                    const q = chatSearchQuery.trim().toLowerCase();
                                                    const textMatch = Boolean(msg.text?.toLowerCase().includes(q));
                                                    const senderMatch = Boolean(msg.senderName?.toLowerCase().includes(q));
                                                    const mediaMatch = Boolean(msg.mediaUrl?.toLowerCase().includes(q));
                                                    return textMatch || senderMatch || mediaMatch;
                                                }

                                                return true;
                                            })
                                            .map((msg, index, filteredArray) => {
                                                const isMe = msg.senderId === user.uid;

                                                if (msg.type === 'media_group') {
                                                    return (
                                                        <motion.div
                                                            key={msg.id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} mb-6 group/msg`}
                                                        >
                                                            {!isMe && (
                                                                <div className="w-8 h-8 rounded-full overflow-hidden self-end border border-white/10 bg-white/5 flex-shrink-0 mb-0.5">
                                                                    <img
                                                                        src={msg.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                                {!isMe && (
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted ml-1 mb-1 flex items-center gap-1">
                                                                        <span>{msg.senderName}</span>
                                                                        <VerificationBadge role={msg.senderRole} />
                                                                    </div>
                                                                )}

                                                                <div className={`p-2 rounded-2xl shadow-lg relative ${isMe ? 'bg-sparta-gold/20 border border-sparta-gold/20' : 'bg-white/5 border border-white/5'}`}>
                                                                    <div className={`grid gap-1 ${msg.items.length === 2 ? 'grid-cols-2' : (msg.items.length >= 3 ? 'grid-cols-2' : 'grid-cols-1')}`}>
                                                                        {msg.items.map((item: any) => (
                                                                            <div
                                                                                key={item.id}
                                                                                className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all aspect-square bg-black/20 group/mediaitem"
                                                                                onClick={() => setSelectedMediaForLightbox(item)}
                                                                                onContextMenu={(e) => handleContextMenu(e, item.id || msg.id)}
                                                                                onTouchStart={(e) => handleTouchStart(e, item.id || msg.id)}
                                                                                onTouchMove={handleTouchMove}
                                                                                onTouchEnd={handleTouchEnd}
                                                                            >
                                                                                {item.mediaType === 'image' ? (
                                                                                    <img src={item.mediaUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                                                                                ) : (
                                                                                    <div className="w-full h-full relative flex items-center justify-center">
                                                                                        <video src={item.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                                                                                        <Play size={24} className="text-sparta-gold absolute" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className={`text-[8px] mt-2 flex items-center gap-1.5 ${isMe ? 'justify-end text-muted' : 'text-white/30'}`}>
                                                                        {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                                                        {isMe && (
                                                                            <span className="ml-0.5">
                                                                                {(() => {
                                                                                    const readBy = groupData?.readBy || {};
                                                                                    const msgTime = msg.timestamp?.toMillis?.() || (msg.timestamp?.seconds * 1000) || 0;
                                                                                    const isReadByOthers = Object.keys(readBy).some(uid =>
                                                                                        uid !== user.uid && (readBy[uid]?.toMillis?.() || (readBy[uid]?.seconds * 1000) || 0) >= msgTime
                                                                                    );
                                                                                    return isReadByOthers ? <CheckCheck size={10} className="text-blue-500" /> : <Check size={10} />;
                                                                                })()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Reactions on Media Group */}
                                                                {(() => {
                                                                    const groupReactions: Record<string, string[]> = {};
                                                                    msg.items.forEach((it: any) => {
                                                                        if (it.reactions) {
                                                                            Object.entries(it.reactions).forEach(([k, uids]: [string, any]) => {
                                                                                if (Array.isArray(uids)) {
                                                                                    if (!groupReactions[k]) groupReactions[k] = [];
                                                                                    uids.forEach(uid => {
                                                                                        if (!groupReactions[k].includes(uid)) groupReactions[k].push(uid);
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                    return (
                                                                        <SpartaMessageReactionBadges
                                                                            reactions={groupReactions}
                                                                            currentUserId={user?.uid}
                                                                            onToggleReaction={(k) => handleReaction(msg.items[0]?.id || msg.id, k)}
                                                                            alignRight={isMe}
                                                                        />
                                                                    );
                                                                })()}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }

                                                const showAvatar = index === 0 || filteredArray[index - 1].senderId !== msg.senderId;

                                                return (
                                                    <motion.div
                                                        key={msg.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                                        id={`msg-${msg.id}`}
                                                        className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} mb-6 group/msg transition-all duration-300 ${contextMenu?.msgId === msg.id ? 'relative z-50' : ''}`}
                                                        onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                                        onClick={() => {
                                                            if (isSelectMode) {
                                                                setSelectedMessages(prev =>
                                                                    prev.includes(msg.id)
                                                                        ? prev.filter(id => id !== msg.id)
                                                                        : [...prev, msg.id]
                                                                );
                                                            }
                                                        }}
                                                        onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                                        onTouchMove={handleTouchMove}
                                                        onTouchEnd={handleTouchEnd}
                                                    >
                                                        {/* Selection Checkbox */}
                                                        <AnimatePresence>
                                                            {isSelectMode && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.5, x: isMe ? 20 : -20 }}
                                                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.5, x: isMe ? 20 : -20 }}
                                                                    className="flex-shrink-0 mb-4"
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMessages.includes(msg.id)
                                                                            ? 'bg-sparta-gold border-sparta-gold text-black'
                                                                            : 'border-white/20 bg-white/5'
                                                                        }`}>
                                                                        {selectedMessages.includes(msg.id) && <Check size={14} strokeWidth={4} />}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {!isMe && (
                                                            <div className="self-end mb-0.5 flex-shrink-0">
                                                                {showAvatar ? (
                                                                    <SpartaAvatar
                                                                        src={msg.senderAvatar || groupMembers.find(m => m.id === msg.senderId)?.photoURL || groupMembers.find(m => m.id === msg.senderId)?.avatarUrl}
                                                                        name={msg.senderName}
                                                                        role={msg.senderRole}
                                                                        isAdmin={msg.senderId === 'admin_sparta' || msg.senderRole === 'admin' || msg.senderRole === 'director' || msg.senderName?.includes('Администрация')}
                                                                        isCoach={msg.senderRole === 'coach' || msg.senderRole === 'trainer'}
                                                                        size="sm"
                                                                        onClick={() => !isSelectMode && handleStartPrivateChat(msg.senderId, msg.senderName)}
                                                                        className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8" />
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className={`max-w-[80%] relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                            {!isMe && showAvatar && (
                                                                <span
                                                                    className="text-[9px] font-black uppercase tracking-widest text-sparta-gold/50 mb-1 block ml-1 cursor-pointer hover:text-sparta-gold transition-colors"
                                                                    onClick={() => handleStartPrivateChat(msg.senderId, msg.senderName)}
                                                                >
                                                                    {msg.senderName}
                                                                    <VerificationBadge role={msg.senderRole} verification={msg.senderVerification} />
                                                                </span>
                                                            )}

                                                            {msg.forwardedFrom && (
                                                                <div className="flex items-center gap-1.5 text-[8px] text-white/30 uppercase font-black mb-1 ml-1 italic">
                                                                    <Forward size={10} /> Переслано от {msg.forwardedFrom.senderName}
                                                                    <VerificationBadge role={msg.forwardedFrom.senderRole} verification={msg.forwardedFrom.senderVerification} />
                                                                </div>
                                                            )}

                                                            <div className="relative">
                                                                {msg.type === 'poll' ? (
                                                                    <PollMessage
                                                                        pollId={msg.pollId}
                                                                        groupId={groupId}
                                                                        userId={user.uid}
                                                                        isMe={isMe}
                                                                    />
                                                                ) : msg.type === 'training_card' ? (
                                                                    <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col gap-4 min-w-[280px] ${isMe ? 'bg-black/20 border-white/10' : 'bg-white/5 border-white/10'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                                                                <Trophy size={24} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-sparta-gold opacity-60">Тренировка</p>
                                                                                <p className="text-sm font-russo text-white uppercase leading-tight">{msg.trainingData?.date}, {msg.trainingData?.time}</p>
                                                                            </div>
                                                                            {msg.trainingData?.capacity > 0 && (
                                                                                <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                                                    <p className="text-[8px] font-black text-muted uppercase text-center">Места</p>
                                                                                    <p className={`text-[10px] font-bold text-center ${msg.trainingData?.attendees?.length >= msg.trainingData?.capacity ? 'text-red-500' : 'text-sparta-gold'}`}>
                                                                                        {msg.trainingData?.attendees?.length}/{msg.trainingData?.capacity}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="flex items-center gap-2 text-[10px] text-secondary bg-white/5 p-2 rounded-xl">
                                                                                <MapPin size={12} className="text-sparta-gold" />
                                                                                <span className="truncate">{msg.trainingData?.location}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-[10px] text-secondary bg-white/5 p-2 rounded-xl">
                                                                                <User size={12} className="text-sparta-gold" />
                                                                                <span className="truncate">{msg.trainingData?.coach}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Deadline Info */}
                                                                        {msg.trainingData?.startAt && msg.trainingData.deadlineHours > 0 && (
                                                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider px-1">
                                                                                <Clock size={10} className="text-white/20" />
                                                                                <span className="text-white/20">Регистрация до:</span>
                                                                                <span className="text-muted">
                                                                                    {format(subHours(msg.trainingData.startAt.toDate(), msg.trainingData.deadlineHours), 'dd.MM HH:mm')}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
                                                                            {(() => {
                                                                                const isAttending = msg.trainingData?.attendees?.includes(user.uid);
                                                                                const isFull = msg.trainingData?.capacity > 0 && msg.trainingData?.attendees?.length >= msg.trainingData?.capacity;
                                                                                const startAt = msg.trainingData?.startAt?.toDate();
                                                                                const isPastDeadline = startAt && isAfter(new Date(), subHours(startAt, msg.trainingData.deadlineHours || 0));
                                                                                const isFinished = startAt && isAfter(new Date(), new Date(startAt.getTime() + 90 * 60000)); // 1.5h pass
                                                                                const myRating = msg.trainingData?.ratings?.[user.uid];
                                                                                const isClosed = !isAttending && (isFull || isPastDeadline || isFinished);

                                                                                if (isFinished && isAttending && !myRating) {
                                                                                    return (
                                                                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 animate-in fade-in zoom-in duration-500">
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-sparta-gold mb-3 text-center">Как прошла тренировка?</p>
                                                                                            <div className="flex justify-center gap-3">
                                                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                                                    <button
                                                                                                        key={star}
                                                                                                        onClick={(e) => { e.stopPropagation(); handleRateTraining(msg.id, star); }}
                                                                                                        className="text-white/20 hover:text-sparta-gold hover:scale-125 transition-all"
                                                                                                    >
                                                                                                        <Sparkles size={18} fill={star <= (myRating || 0) ? "currentColor" : "none"} />
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                if (isFinished && myRating) {
                                                                                    return (
                                                                                        <div className="flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-green-500/60">
                                                                                            <Check size={12} /> Ваша оценка: {myRating}/5
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <div className="flex gap-2">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); if (!isClosed) handleToggleAttendance(msg.id); }}
                                                                                            disabled={isClosed}
                                                                                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 ${isAttending ? 'bg-green-500 text-white' :
                                                                                                    isClosed ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                                                                                                        'bg-sparta-gold text-black hover:scale-[1.02]'
                                                                                                }`}
                                                                                        >
                                                                                            {isAttending ? <CheckCircle2 size={14} /> : isFull ? <Users size={14} /> : isPastDeadline ? <Clock size={14} /> : null}
                                                                                            {isAttending ? 'Я буду!' : isFull ? 'Мест нет' : isPastDeadline ? 'Запись закрыта' : 'Я приду'}
                                                                                        </button>

                                                                                        {/* Calendar Integration Placeholder */}
                                                                                        {isAttending && (
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    const text = encodeURIComponent(`Тренировка: ${msg.trainingData.name || 'Спарта'}`);
                                                                                                    const details = encodeURIComponent(`Тренер: ${msg.trainingData.coach}\nМесто: ${msg.trainingData.location}`);
                                                                                                    const date = msg.trainingData.startAt.toDate();
                                                                                                    const end = new Date(date.getTime() + 90 * 60000); // +90 min
                                                                                                    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
                                                                                                    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(date)}/${fmt(end)}&details=${details}&location=${encodeURIComponent(msg.trainingData.location)}`;
                                                                                                    window.open(url, '_blank');
                                                                                                }}
                                                                                                className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-all"
                                                                                                title="Добавить в календарь"
                                                                                            >
                                                                                                <Zap size={14} />
                                                                                            </button>
                                                                                        )}

                                                                                        {(isAdmin || isTrainer) && msg.trainingData?.startAt && (
                                                                                            <button
                                                                                                onClick={async (e) => {
                                                                                                    e.stopPropagation();
                                                                                                    const attendees = msg.trainingData.attendees || [];
                                                                                                    const lazyOnes = groupMembers.filter(m => !attendees.includes(m.id));

                                                                                                    if (lazyOnes.length === 0) {
                                                                                                        alert("Все уже записались! 🔥");
                                                                                                        return;
                                                                                                    }

                                                                                                    // 1. Send public chat reminder (prepare)
                                                                                                    const mentions = lazyOnes.map(m => `@${m.full_name || m.childName || 'участник'}`).join(' ');
                                                                                                    setNewMessage(`${mentions}\n\nРебята, не забываем записываться на тренировку! ⚽🥊`);

                                                                                                    // 2. Send private system notifications
                                                                                                    try {
                                                                                                        const promises = lazyOnes.map(member => {
                                                                                                            if (!member.id) return Promise.resolve();
                                                                                                            return addDoc(collection(db, "notifications"), {
                                                                                                                userId: member.id,
                                                                                                                title: "Напоминание о тренировке ⚽",
                                                                                                                message: `Вы еще не записались на тренировку ${msg.trainingData.date} в ${msg.trainingData.time}. Ждем вас!`,
                                                                                                                type: 'training_reminder',
                                                                                                                isRead: false,
                                                                                                                createdAt: serverTimestamp(),
                                                                                                                relatedId: msg.id
                                                                                                            });
                                                                                                        });
                                                                                                        await Promise.all(promises);
                                                                                                        alert(`Напоминания отправлены ${lazyOnes.length} участникам! 🚀`);
                                                                                                    } catch (err) {
                                                                                                        console.error("Error sending notifications:", err);
                                                                                                        alert("Ошибка при отправке уведомлений");
                                                                                                    }

                                                                                                    // Focus the input
                                                                                                    const input = document.querySelector('textarea');
                                                                                                    if (input) input.focus();
                                                                                                }}
                                                                                                className="p-3 bg-white/10 text-white hover:bg-orange-500/20 hover:text-orange-500 rounded-xl transition-all"
                                                                                                title="Напомнить участникам"
                                                                                            >
                                                                                                <Send size={14} />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            <div className="flex flex-wrap gap-2 px-1">
                                                                                {msg.trainingData?.attendees?.map((uid: string) => {
                                                                                    const isMeAttendee = uid === user?.uid;
                                                                                    const member = groupMembers.find(m => m.id === uid);
                                                                                    const profileSource = isMeAttendee ? { ...member, ...userProfile } : member;
                                                                                    const avatar = (isMeAttendee ? (userProfile?.photoURL || user?.photoURL) : null) ||
                                                                                        profileSource?.photoURL || profileSource?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

                                                                                    return (
                                                                                        <div key={uid} className="relative group/attendee">
                                                                                            <div className={`w-8 h-8 rounded-xl border bg-white/5 overflow-hidden transition-all p-0.5 ${isMeAttendee ? 'border-sparta-gold scale-110 z-10' : 'border-white/10'}`}>
                                                                                                <img src={avatar} alt="" className="w-full h-full object-cover rounded-lg" />
                                                                                            </div>
                                                                                            {/* Tooltip on hover */}
                                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg opacity-0 group-hover/attendee:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">
                                                                                                <p className="text-[8px] font-black uppercase text-white px-1">
                                                                                                    {isMeAttendee ? 'Вы' : (member?.childName || member?.full_name || '...')}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {(!msg.trainingData?.attendees || msg.trainingData.attendees.length === 0) && (
                                                                                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest py-2">Мест еще много – записывайся!</p>
                                                                                )}
                                                                         </div>
                                                                         </div>
                                                                          </div>
                                                                        ) : (msg.type === 'schedule_announcement' || (typeof msg.text === 'string' && (msg.text.includes('SPARTA • РАСПИСАНИЕ') || msg.text.includes('РАСПИСАНИЕ ТРЕНИРОВОК') || msg.text.includes('ОФИЦИАЛЬНОЕ РАСПИСАНИЕ')))) ? (
                                                                            <div className="relative">
                                                                                <SpartaScheduleChatCard
                                                                                    text={msg.text}
                                                                                    scheduleMeta={msg.scheduleMeta}
                                                                                    isMe={isMe}
                                                                                />

                                                                                {/* Time, Edited & Read Status */}
                                                                                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end text-white/50' : 'text-white/30'}`}>
                                                                                    {msg.isEdited && (
                                                                                        <span className="text-[8px] italic flex items-center gap-0.5 text-white/40">
                                                                                            <Pencil size={8} /> изм.
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                                                                        {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                                                                    </span>
                                                                                    {isMe && <CheckCheck size={10} />}
                                                                                </div>

                                                                                {/* Reactions */}
                                                                                <SpartaMessageReactionBadges
                                                                                    reactions={msg.reactions}
                                                                                    currentUserId={user?.uid}
                                                                                    onToggleReaction={(k) => handleReaction(msg.id, k)}
                                                                                    alignRight={isMe}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                    <div className={`p-4 rounded-2xl shadow-lg relative ${
                                                                        msg.isAnnouncement
                                                                            ? msg.priority === 'urgent'
                                                                                ? 'bg-red-950/50 border-2 border-red-500/70 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                                                                : 'bg-gradient-to-br from-amber-950/40 via-black/80 to-sparta-gold/20 border-2 border-sparta-gold/60 text-white shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                                                                            : isMe
                                                                            ? 'bg-sparta-gold text-black font-bold'
                                                                            : 'bg-white/5 border border-white/5 text-white/90'
                                                                    }`}>
                                                                        {/* Announcement Banner */}
                                                                        {msg.isAnnouncement && (
                                                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className={`p-1.5 rounded-lg ${msg.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-sparta-gold/20 text-sparta-gold'}`}>
                                                                                        <Shield size={14} />
                                                                                    </div>
                                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-sparta-gold">
                                                                                        {msg.title || 'Официальное объявление тренера'}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                                                                    Важно
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video') && (
                                                                            <div
                                                                                className="mb-2 rounded-2xl overflow-hidden cursor-pointer shadow-lg relative group/singlemedia"
                                                                                onClick={() => setSelectedMediaForLightbox(msg)}
                                                                                onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                                                                onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                                                                onTouchMove={handleTouchMove}
                                                                                onTouchEnd={handleTouchEnd}
                                                                            >
                                                                                {msg.mediaType === 'image' ? (
                                                                                    <SpartaProgressiveImage
                                                                                        src={msg.mediaUrl}
                                                                                        alt=""
                                                                                        isUploading={msg.isUploading}
                                                                                        uploadProgress={msg.uploadProgress}
                                                                                        className="w-full max-h-80 object-cover hover:scale-105 transition-transform pointer-events-none"
                                                                                    />
                                                                                ) : msg.mediaType === 'video' ? (
                                                                                    <div className="relative aspect-video bg-black/40 flex items-center justify-center">
                                                                                        <video src={msg.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                                                                                                <Play size={24} fill="currentColor" />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        )}

                                                                        {(msg.type === 'voice' || msg.mediaType === 'voice') && (
                                                                            <VoicePlayer
                                                                                msgId={msg.id}
                                                                                audioUrl={msg.mediaUrl}
                                                                                duration={msg.duration}
                                                                                isMe={isMe}
                                                                                playbackSpeed={playbackSpeed}
                                                                                onSpeedChange={cyclePlaybackSpeed}
                                                                                onTranscribe={handleTranscribe}
                                                                                transcriptionText={transcriptions[msg.id]}
                                                                                isTranscribing={!!isTranscribing[msg.id]}
                                                                                onPlayStart={() => {
                                                                                    if (isRecording) setIsRecording(false);
                                                                                }}
                                                                            />
                                                                        )}

                                                                        {msg.text && (
                                                                            <div className="whitespace-pre-wrap leading-relaxed">
                                                                                {renderRichText(msg.text)}
                                                                            </div>
                                                                        )}

                                                                        {/* Time, Edited & Read Status */}
                                                                        <div className={`flex items-center gap-1.5 mt-2 ${isMe ? 'justify-end text-black/50' : 'text-white/30'}`}>
                                                                            {msg.isEdited && (
                                                                                <span className={`text-[8px] italic flex items-center gap-0.5 ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                                                                                    <Pencil size={8} /> изм.
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[8px] font-black uppercase tracking-widest">
                                                                                {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                                                            </span>
                                                                            {msg.isUploading ? (
                                                                                <span className="text-sparta-gold animate-spin inline-flex items-center" title="Отправка...">
                                                                                    <Loader2 size={10} />
                                                                                </span>
                                                                            ) : (
                                                                                isMe && <CheckCheck size={10} />
                                                                            )}
                                                                        </div>

                                                                        {/* Reactions */}
                                                                        <SpartaMessageReactionBadges
                                                                            reactions={msg.reactions}
                                                                            currentUserId={user?.uid}
                                                                            onToggleReaction={(k) => handleReaction(msg.id, k)}
                                                                            alignRight={isMe}
                                                                        />
                                                                        </div>
                                                                 )}
                                                            </div>

                                                            {/* Thread Discussion Button — visible below bubble */}
                                                            {threadCounts[msg.id] > 0 && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setFilterThreadId(msg.id); }}
                                                                    className={`mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border group/thread
                                                                            ${isMe
                                                                            ? 'bg-sparta-gold/20 border-sparta-gold/30 text-sparta-gold hover:bg-sparta-gold/30'
                                                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-sparta-gold/10 hover:border-sparta-gold/30 hover:text-sparta-gold'
                                                                        }`}
                                                                >
                                                                    <MessageCircle size={12} className="group-hover/thread:scale-110 transition-transform" />
                                                                    <span>{threadCounts[msg.id]} {threadCounts[msg.id] === 1 ? 'ответ' : 'ответа'}</span>
                                                                    <span className="opacity-50">· Обсудить</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </AnimatePresence>
                                </motion.div>
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                {/* Thread Sidebar */}
                <AnimatePresence>
                    {filterThreadId && (
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#121212]/95 backdrop-blur-3xl border-l border-white/10 flex flex-col z-[150] shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                        >
                            {/* Sidebar Header */}
                            <div className="p-6 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-russo text-white uppercase tracking-tight">Обсуждение</h3>
                                        <p className="text-[10px] text-muted font-black uppercase tracking-widest">Ветка сообщений</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFilterThreadId(null)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all hover:rotate-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Sidebar Messages */}
                            <div ref={threadContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative" style={{ backgroundImage: 'var(--messenger-chat-bg)', backgroundRepeat: 'repeat' }}>
                                {messages
                                    .filter(msg => msg.id === filterThreadId || msg.replyToId === filterThreadId)
                                    .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
                                    .map((msg, index, filteredThreadArray) => {
                                        const isMe = msg.senderId === user.uid;
                                        const isOriginal = msg.id === filterThreadId;
                                        const showAvatar = index === 0 || filteredThreadArray[index - 1].senderId !== msg.senderId;

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                layout
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isOriginal ? 'bg-sparta-gold/5 p-4 rounded-3xl border border-sparta-gold/10' : ''}`}
                                            >
                                                {!isMe && (
                                                    <div className="shrink-0">
                                                        {showAvatar ? (
                                                            <SpartaAvatar
                                                                src={msg.senderPhoto || msg.senderAvatar || groupMembers.find(m => m.id === msg.senderId)?.photoURL}
                                                                name={msg.senderName}
                                                                role={msg.senderRole}
                                                                isAdmin={msg.senderId === 'admin_sparta' || msg.senderRole === 'admin' || msg.senderRole === 'director' || msg.senderName?.includes('Администрация')}
                                                                isCoach={msg.senderRole === 'coach' || msg.senderRole === 'trainer'}
                                                                size="sm"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8" />
                                                        )}
                                                    </div>
                                                )}

                                                <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {isOriginal && (
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-sparta-gold mb-1 ml-1">Первоначальное сообщение</span>
                                                    )}
                                                    {!isMe && showAvatar && (
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted ml-1 mb-1 flex items-center gap-1">
                                                            <span>{msg.senderName}</span>
                                                            <VerificationBadge role={msg.senderRole} />
                                                        </div>
                                                    )}

                                                    {(msg.type === 'schedule_announcement' || (typeof msg.text === 'string' && (msg.text.includes('SPARTA • РАСПИСАНИЕ') || msg.text.includes('РАСПИСАНИЕ ТРЕНИРОВОК') || msg.text.includes('ОФИЦИАЛЬНОЕ РАСПИСАНИЕ')))) ? (
                                                        <div className="relative">
                                                            <SpartaScheduleChatCard
                                                                text={msg.text}
                                                                scheduleMeta={msg.scheduleMeta}
                                                                isMe={isMe}
                                                            />
                                                            <div className={`text-[8px] mt-1 px-1 ${isMe ? 'text-white/40 text-right' : 'text-white/30'}`}>
                                                                {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                    <div className={`p-4 rounded-2xl shadow-lg relative ${isMe ? 'bg-sparta-gold text-black font-bold' : 'bg-white/5 border border-white/5 text-white/90'}`}>
                                                        {msg.mediaUrl && (
                                                            <div className="mb-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedMediaForLightbox(msg)}>
                                                                {msg.mediaType === 'image' ? (
                                                                    <SpartaProgressiveImage src={msg.mediaUrl} alt="" className="w-full max-h-60 object-cover" />
                                                                ) : (
                                                                    <div className="relative aspect-video bg-black flex items-center justify-center">
                                                                        <video src={msg.mediaUrl} className="w-full h-full object-cover" />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <Play size={20} className="text-white fill-current" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="whitespace-pre-wrap">{renderRichText(msg.text)}</div>

                                                        {/* Time */}
                                                        <div className={`text-[8px] mt-2 ${isMe ? 'text-black/40 text-right' : 'text-white/30'}`}>
                                                            {msg.timestamp?.seconds ? format(new Date(msg.timestamp.seconds * 1000), 'HH:mm') : '...'}
                                                        </div>

                                                        {/* Reactions */}
                                                        {msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions[k].length > 0) && (
                                                            <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex flex-wrap gap-1`}>
                                                                {REACTION_EMOJIS.map(emoji => {
                                                                    const voters = msg.reactions[emoji.key] || [];
                                                                    if (voters.length === 0) return null;
                                                                    return (
                                                                        <div key={emoji.key} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-white/10 bg-black/80 backdrop-blur-md text-[10px] text-muted">
                                                                            <span>{emoji.emoji}</span>
                                                                            <span>{voters.length}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                <div ref={threadEndRef} />
                            </div>

                            {/* Sidebar Input */}
                            <div className="p-6 bg-white/[0.02] border-t border-white/10">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendThreadMessage(); }}
                                    className="flex items-end gap-3"
                                >
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-2 flex items-end gap-2 focus-within:border-sparta-gold/30 transition-all">
                                        <textarea
                                            value={threadMessage}
                                            onChange={(e) => setThreadMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendThreadMessage();
                                                }
                                            }}
                                            placeholder="Написать ответ..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-white text-xs py-2 px-3 resize-none max-h-32 scrollbar-hide"
                                            rows={1}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!threadMessage.trim() || isThreadSending}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${threadMessage.trim() && !isThreadSending
                                                ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20 scale-100'
                                                : 'bg-white/5 text-white/20 scale-95 grayscale'
                                            }`}
                                    >
                                        {isThreadSending ? <RotateCcw size={18} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Reply Preview */}
            {replyTo && (
                <div className="mx-6 mb-2 p-3 bg-white/10 border-l-[3px] border-sparta-gold rounded-r-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300 backdrop-blur-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-hidden flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-sparta-gold mb-1">Reply to {replyTo.senderName}</p>
                        <p className="text-xs text-secondary truncate italic">«{replyTo.text}»</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-white/20 hover:text-white">
                        <XIcon size={16} />
                    </button>
                </div>
            )}

            {/* Media/Voice Selection Status Bar */}
            {isSelectMode && selectedMessages.length > 0 && (
                <div className="mx-4 sm:mx-6 mb-3 p-3 bg-[#181820] text-white rounded-2xl flex items-center justify-between shadow-2xl border border-sparta-gold/40 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                            <CheckCheck size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-sparta-gold">
                                Выбрано сообщений: {selectedMessages.length}
                            </span>
                            <span className="text-[10px] text-white/50">
                                Нажмите «Удалить» или «Отмена»
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleBatchDelete}
                            className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                            title="Удалить выбранные"
                        >
                            <Trash2 size={15} className="text-red-400" />
                            <span>Удалить</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSelectMode(false); setSelectedMessages([]); }}
                            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            title="Отмена"
                        >
                            <X size={15} className="text-white/70" />
                            <span>Отмена</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Multi-Media Preview Bar with Drag/Scroll */}
            {mediaPreviews.length > 0 && (
                <div className="mx-3 sm:mx-6 mb-2 p-2 bg-[#121212] border border-white/10 rounded-2xl flex items-center gap-3 overflow-x-auto no-scrollbar shadow-2xl">
                    {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative group shrink-0 w-24 h-24">
                            <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-[#1a1a1a] relative">
                                {preview.type === 'video' ? (
                                    <div className="w-full h-full relative bg-black/60 flex items-center justify-center">
                                        <video src={preview.url} className="w-full h-full object-cover opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-sparta-gold border border-sparta-gold/40">
                                                <Play size={14} fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>
                                ) : preview.type === 'file' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-2 text-center">
                                        <FileText size={28} className="text-sparta-gold mb-1" />
                                        <span className="text-[8px] font-black uppercase text-white/60 truncate w-full">{preview.file.name}</span>
                                    </div>
                                ) : (
                                    <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                )}

                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                                        <CircularProgress size={32} strokeWidth={3} progress={uploadProgress} />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => removeMediaFile(index)}
                                    className="absolute top-1 right-1 p-1 bg-black/80 text-white hover:bg-red-500 rounded-full transition-all shadow-md z-20"
                                    title="Удалить"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Typing Indicator UI */}
            <AnimatePresence>
                {typingUsers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="px-8 py-2 flex items-center gap-2"
                    >
                        <div className="flex gap-1">
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 rounded-full bg-sparta-gold" />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-sparta-gold" />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-sparta-gold" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted italic">
                            {typingUsers.length === 1
                                ? `${typingUsers[0].name} печатает...`
                                : `${typingUsers.length} человека печатают...`}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mentions Suggestion List */}
            <AnimatePresence>
                {mentionSearch !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full left-6 mb-4 bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl min-w-[240px] z-[100]"
                    >
                        <div className="p-4 border-b border-white/5 bg-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">Упомянуть пользователя</p>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {groupMembers
                                .filter(m => (m.full_name || m.childName || '').toLowerCase().includes(mentionSearch.toLowerCase()))
                                .map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            const name = m.full_name || m.childName || m.email;
                                            const before = newMessage.substring(0, newMessage.lastIndexOf('@'));
                                            setNewMessage(before + '@' + name + ' ');
                                            setMentionSearch(null);
                                        }}
                                        className="w-full p-4 flex items-center gap-3 hover:bg-sparta-gold hover:text-black transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-sparta-gold group-hover:bg-black/10 group-hover:text-black transition-colors">
                                            {(m.full_name || m.childName || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold uppercase">{m.full_name || m.childName || m.email}</p>
                                            <p className="text-[9px] font-medium opacity-40 uppercase tracking-tighter">{m.role || 'ученик'}</p>
                                        </div>
                                    </button>
                                ))
                            }
                            {groupMembers.filter(m => (m.full_name || m.childName || '').toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                                <div className="p-8 text-center text-white/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Никто не найден</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-2 sm:p-3.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-[#0c0c0c] border-t border-white/5 shrink-0 sticky bottom-0 z-20">
                {/* Editing Message Banner */}
                {editingMessage && (
                    <div className="flex items-center justify-between px-4 py-2 mb-2 bg-sparta-gold/15 border border-sparta-gold/30 rounded-2xl text-xs max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom duration-200">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="p-1.5 rounded-lg bg-sparta-gold text-black shrink-0">
                                <Pencil size={12} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-black text-sparta-gold uppercase tracking-wider">Редактирование сообщения</p>
                                <p className="text-white/70 truncate text-xs">{editingMessage.text}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingMessage(null);
                                setNewMessage('');
                            }}
                            className="p-1.5 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                            title="Отменить редактирование"
                        >
                            <XIcon size={14} />
                        </button>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-end gap-2 w-full max-w-5xl mx-auto"
                >
                    {isRecording ? (
                        <AudioRecorder
                            onSendAudio={handleSendAudioBlob}
                            onCancel={() => setIsRecording(false)}
                        />
                    ) : (
                        <>
                            <div className="relative flex-1 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[32px] p-1.5 sm:p-2 flex items-end gap-0.5 sm:gap-1 focus-within:border-sparta-gold/30 transition-all">
                                {/* Emoji Picker */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-full left-0 mb-4 z-[200]">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            >
                                                <SpartaEmojiPicker
                                                    onEmojiClick={onEmojiClick}
                                                    onClose={() => setShowEmojiPicker(false)}
                                                />
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>

                                {/* Redesigned Dual-Platform Attachment Menu (PC Popover & Mobile Bottom Sheet) */}
                                <ChatAttachmentMenu
                                    isOpen={showAttachmentSheet}
                                    onClose={() => setShowAttachmentSheet(false)}
                                    onSelectGallery={() => galleryInputRef.current?.click()}
                                    onSelectDoc={() => docInputRef.current?.click()}
                                    onSelectCamera={() => cameraInputRef.current?.click()}
                                    onSelectPoll={(!(groupData?.type === 'private' || groupData?.isPrivate || isChatPrivate) && (isTrainer || isAdmin)) ? () => setIsPollModalOpen(true) : undefined}
                                    onSelectAnnouncement={(isTrainer || isAdmin) ? () => setIsAnnouncementModalOpen(true) : undefined}
                                    onSelectSchedule={(!(groupData?.type === 'private' || groupData?.isPrivate || isChatPrivate) && (isTrainer || isAdmin)) ? () => setIsScheduleModalOpen(true) : undefined}
                                    isTrainerOrAdmin={isTrainer || isAdmin}
                                />

                                <div className="flex items-center gap-1 self-center pl-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowEmojiPicker(!showEmojiPicker);
                                        }}
                                        className={`p-1.5 sm:p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-sparta-gold text-black' : 'hover:bg-white/5 text-white/20'}`}
                                    >
                                        <Smile size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAttachmentSheet(true)}
                                        className={`p-1.5 sm:p-2 rounded-xl transition-all ${showAttachmentSheet ? 'bg-sparta-gold text-black' : 'hover:bg-white/5 text-white/20'}`}
                                        title="Прикрепить файл"
                                    >
                                        <Paperclip size={18} />
                                    </button>

                                    {/* Hidden file inputs for Action Sheet options */}
                                    <input ref={galleryInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
                                    <input ref={docInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.zip,.xls,.xlsx,.txt" />
                                    <input ref={cameraInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*" capture="environment" />
                                </div>

                                <textarea
                                    value={newMessage}
                                    onChange={(e) => handleNewMessageChange(e.target.value)}
                                    onPaste={handlePaste}
                                    placeholder="Сообщение..."
                                    className="flex-1 bg-transparent border-none outline-none text-white text-xs py-2.5 resize-none max-h-32 scrollbar-hide uppercase font-bold tracking-wider placeholder:text-white/10"
                                    rows={1}
                                    onFocus={() => {
                                        setTimeout(() => scrollToBottom(true), 150);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />

                                <div className="flex items-center gap-0.5 sm:gap-1 self-center pr-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsRecording(true)}
                                        className="p-1.5 sm:p-2 transition-all rounded-xl text-white/20 hover:text-sparta-gold hover:bg-white/5"
                                        title="Записать голосовое сообщение"
                                    >
                                        <Mic size={18} />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={(!newMessage.trim() && mediaFiles.length === 0) || isSending || isUploading}
                                className="p-3.5 sm:p-4 bg-sparta-gold text-black rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-sparta-gold/20 shrink-0"
                            >
                                {isSending || isUploading ? <RotateCcw size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </>
                    )}
                </form>
            </div>

            {/* Modals & Popovers */}

            <CreatePollModal
                isOpen={isPollModalOpen}
                onClose={() => setIsPollModalOpen(false)}
                groupId={groupId}
                chatId={chatId}
                isUnifiedChat={isUnifiedChat}
                user={user}
                userProfile={userProfile}
            />

            {/* Multi-Media Upload Tray Modal */}
            <MediaUploadTrayModal
                isOpen={isMediaTrayOpen}
                onClose={() => {
                    setIsMediaTrayOpen(false);
                    setMediaFiles([]);
                    setMediaPreviews([]);
                }}
                items={mediaPreviews}
                onAddMore={() => galleryInputRef.current?.click()}
                onRemoveItem={removeMediaFile}
                onReplaceItem={replaceMediaFile}
                onSend={handleBatchSendMedia}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                isTrainerOrAdmin={isTrainer || isAdmin}
            />

            {/* Sparta Live Video Modal */}
            <AnimatePresence>
                {isVideoCallOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full h-full flex flex-col"
                        >
                            <div className="p-4 bg-[#111] border-b border-white/5 flex items-center justify-between px-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 flex items-center justify-center text-sparta-gold">
                                        <VideoIcon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-russo text-white uppercase tracking-tight">Sparta Live</h3>
                                        <p className="text-[10px] text-sparta-gold/60 uppercase font-black">Онлайн-собрание группы</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsVideoCallOpen(false)}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all flex items-center gap-2"
                                >
                                    Завершить встречу
                                </button>
                            </div>
                            <div className="flex-1 bg-black relative">
                                <iframe
                                    src={`https://meet.jit.si/sparta_live_${chatId?.substring(0, 8)}#config.defaultLanguage="ru"&config.prejoinPageEnabled=false&config.showJitsiWatermark=false&config.showBrandWatermark=false&config.hideJitsiMeetLogo=true&config.hideConferenceTimer=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.SHOW_POWERED_BY=false&interfaceConfig.JITSI_WATERMARK_LINK=""&interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME="Участник Спарты"&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
                                    allow="camera; microphone; display-capture; autoplay; clipboard-write"
                                    className="w-full h-full border-none"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Smart Forward Modal (Family, Teammates, Saved, Groups) */}
            <SpartaForwardModal
                isOpen={isForwardModalOpen}
                onClose={() => {
                    setIsForwardModalOpen(false);
                    setForwardMessages([]);
                    setSelectedForwardGroups([]);
                }}
                messagesToForward={forwardMessages}
                currentUser={user}
                currentUserProfile={userProfile}
                currentGroupName={groupData?.chatTitle || groupName}
                groupMembers={groupMembers}
                myGroups={myGroups}
            />

            {/* Context Menu */}
            <MessageContextMenu
                contextMenu={contextMenu}
                onClose={() => setContextMenu(null)}
                userProfile={userProfile}
                message={currentContextMessage}
                currentUserId={user?.uid}
                isSavedChat={groupData?.type === 'saved' || chatId?.startsWith('saved_')}
                isPrivateChat={groupData?.type === 'private' || groupData?.isPrivate}
                isChannel={groupData?.type === 'channel'}
                isPinned={Boolean((groupData?.pinnedMessageId && groupData.pinnedMessageId === currentContextMessage?.id) || (pinnedMessage?.id && pinnedMessage.id === currentContextMessage?.id))}
                onReaction={(msgId, key) => handleReaction(msgId, key)}
                onReply={(msg) => setReplyTo({ id: msg.id, text: msg.text || (msg.mediaUrl ? "Медиа" : "Сообщение"), senderName: msg.senderName })}
                onEdit={(msg) => {
                    setEditingMessage({ id: msg.id, text: msg.text || '' });
                    setNewMessage(msg.text || '');
                    setReplyTo(null);
                }}
                onDiscuss={(msgId) => setFilterThreadId(msgId)}
                onPin={(msgId) => handlePinMessage(msgId)}
                onForward={(msg) => { setForwardMessages([msg]); setIsForwardModalOpen(true); }}
                onSaveToFavorites={handleQuickSaveToFavorites}
                onCopy={async (msg) => {
                    if (msg.mediaUrl && msg.mediaType === 'image') {
                        const success = await copyImageToClipboard(msg.mediaUrl);
                        if (!success) {
                            await navigator.clipboard.writeText(msg.mediaUrl);
                            alert("Ссылка скопирована (бинарное копирование недоступно)");
                        } else {
                            alert("Изображение скопировано в буфер");
                        }
                    } else {
                        await navigator.clipboard.writeText(msg.text || "");
                        alert("Текст скопирован");
                    }
                }}
                onSelect={(msgId) => {
                    setIsSelectMode(true);
                    setSelectedMessages(prev => [...prev, msgId]);
                }}
                onPrivateChat={onStartPrivateChat}
                onDelete={(msgId) => handleDeleteMessage(msgId)}
                onDownload={async (mediaUrl) => {
                    const fileName = mediaUrl.split('/').pop()?.split('?')[0] || 'file';
                    await downloadFile(mediaUrl, fileName);
                }}
                onOpenMedia={(msg) => setSelectedMediaForLightbox(msg)}
            />

            {/* Group Profile / Media Hub Sidebar Drawer */}
            <AnimatePresence>
                {showProfile && (
                    <ChatProfileDrawer
                        isOpen={showProfile}
                        onClose={() => {
                            setShowProfile(false);
                            setSelectedUserProfile(null);
                        }}
                        groupData={groupData}
                        groupId={groupId}
                        chatId={chatId}
                        groupName={groupName}
                        currentUser={user}
                        currentUserProfile={userProfile}
                        selectedUserProfile={selectedUserProfile}
                        setSelectedUserProfile={setSelectedUserProfile}
                        groupMembers={groupMembers}
                        allMediaMessages={allMediaMessages}
                        isMuted={isChatMuted}
                        onToggleMute={toggleChatMute}
                        onStartPrivateChat={(targetId, targetName) => {
                            setShowProfile(false);
                            handleStartPrivateChat(targetId, targetName);
                        }}
                        onOpenMediaLightbox={(media) => setSelectedMediaForLightbox(media)}
                        onScrollToMessage={(targetMsgId) => {
                            setShowProfile(false);
                            setTimeout(() => scrollToMessage(targetMsgId), 150);
                        }}
                        onAddParticipant={isUnifiedChat ? () => setIsAddParticipantOpen(true) : undefined}
                        onKickParticipant={(targetId, targetName) => handleKickParticipant(targetId, targetName)}
                        onTransferOwnership={(targetId, targetName) => handleTransferOwnership(targetId, targetName)}
                        onLeaveGroup={handleLeaveGroup}
                        getUserStatus={getUserStatus}
                        getRoleBadge={getRoleBadge}
                        VerificationBadge={VerificationBadge}
                    />
                )}
            </AnimatePresence>

            {/* Add Participant Modal */}
            <AnimatePresence>
                {isAddParticipantOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111] border border-white/10 p-6 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-russo text-white uppercase tracking-tight">Добавить в чат</h3>
                                <button onClick={() => setIsAddParticipantOpen(false)} className="text-white/20 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="text"
                                    placeholder="Поиск по имени..."
                                    value={participantSearchQuery}
                                    onChange={(e) => handleSearchParticipants(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-sparta-gold transition-all"
                                />
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {isSearchingParticipants ? (
                                    <div className="py-10 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparta-gold mx-auto mb-2" />
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Поиск...</p>
                                    </div>
                                ) : participantSearchResults.length > 0 ? (
                                    participantSearchResults.map(u => (
                                        <div
                                            key={u.id}
                                            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center">
                                                    {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <User size={20} className="text-white/20" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{u.full_name || u.childName}</p>
                                                    <p className="text-[10px] text-muted uppercase font-black tracking-tighter truncate">{u.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddParticipant(u.id)}
                                                className="p-2 bg-sparta-gold text-black rounded-xl hover:scale-105 transition-transform shadow-lg shadow-sparta-gold/20 flex-shrink-0 ml-2"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    ))
                                ) : participantSearchQuery.length > 0 ? (
                                    <p className="py-10 text-center text-[10px] text-white/20 uppercase font-black tracking-widest">Результатов не найдено</p>
                                ) : (
                                    <p className="py-10 text-center text-[10px] text-white/20 uppercase font-black tracking-widest">Введите имя для поиска</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sparta Media Gallery Modal */}
            <SpartaMediaGalleryModal
                isOpen={!!selectedMediaForLightbox}
                onClose={() => setSelectedMediaForLightbox(null)}
                initialItem={selectedMediaForLightbox}
                allMediaItems={allGalleryMediaItems}
                onReply={(item) => {
                    setReplyTo({
                        id: item.id,
                        text: item.text || (item.mediaType === 'video' ? "📹 Видео" : "📷 Фото"),
                        senderName: item.senderName || "Спарта"
                    });
                    setSelectedMediaForLightbox(null);
                    setTimeout(() => {
                        const input = document.querySelector('textarea') as HTMLTextAreaElement;
                        input?.focus();
                    }, 150);
                }}
                onForward={(item) => {
                    const originalMsg = messages.find(m => m.id === item.id) || item;
                    setForwardMessages([originalMsg]);
                    setSelectedMediaForLightbox(null);
                    setIsForwardModalOpen(true);
                }}
                onDelete={(itemId) => handleDeleteMessage(itemId)}
                canDelete={['admin', 'director', 'developer', 'coach', 'trainer'].includes((userProfile?.role || '').toLowerCase()) || selectedMediaForLightbox?.senderId === user?.uid}
            />


            {/* Schedule Modal */}
            <AnimatePresence>
                {isScheduleModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111] border border-white/10 p-6 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-russo text-white uppercase tracking-tight">
                                    {isEditingSession ? 'Редактировать тренировку' : 'Запланировать тренировку'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsScheduleModalOpen(false);
                                        setIsEditingSession(false);
                                        setEditingSessionData(null);
                                    }}
                                    className="text-white/20 hover:text-white"
                                >
                                    <XIcon size={20} />
                                </button>
                            </div>

                            {isEditingSession ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Название</label>
                                        <input
                                            type="text"
                                            value={editingSessionData?.name || ''}
                                            onChange={(e) => setEditingSessionData({ ...editingSessionData, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                            placeholder="Напр. Основная тренировка"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Дата/День</label>
                                            <input
                                                type="text"
                                                value={editingSessionData?.date || ''}
                                                onChange={(e) => setEditingSessionData({ ...editingSessionData, date: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                                placeholder="Напр. Завтра"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Время</label>
                                            <input
                                                type="text"
                                                value={editingSessionData?.time || ''}
                                                onChange={(e) => setEditingSessionData({ ...editingSessionData, time: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                                placeholder="18:00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Место</label>
                                        <input
                                            type="text"
                                            value={editingSessionData?.location || ''}
                                            onChange={(e) => setEditingSessionData({ ...editingSessionData, location: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                            placeholder="Напр. Главный зал"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Лимит мест</label>
                                            <input
                                                type="number"
                                                value={editingSessionData?.capacity || ''}
                                                onChange={(e) => setEditingSessionData({ ...editingSessionData, capacity: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                                placeholder="0 = без лимита"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block ml-1">Дедлайн (часы)</label>
                                            <input
                                                type="number"
                                                value={editingSessionData?.deadlineHours || ''}
                                                onChange={(e) => setEditingSessionData({ ...editingSessionData, deadlineHours: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold outline-none transition-all font-medium"
                                                placeholder="0 = до начала"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-1">
                                        <button
                                            onClick={() => setEditingSessionData({ ...editingSessionData, isRecurring: !editingSessionData?.isRecurring })}
                                            className={`w-10 h-6 rounded-full transition-all relative ${editingSessionData?.isRecurring ? 'bg-sparta-gold' : 'bg-white/10'}`}
                                        >
                                            <motion.div
                                                animate={{ x: editingSessionData?.isRecurring ? 18 : 3 }}
                                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                            />
                                        </button>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Повторять еженедельно</span>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                setIsEditingSession(false);
                                                setEditingSessionData(null);
                                            }}
                                            className="flex-1 py-4 bg-white/5 text-muted font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!groupId) return;
                                                try {
                                                    const templatesRef = collection(db, 'groups', groupId, 'training_templates');
                                                    if (editingSessionData?.id) {
                                                        await setDoc(doc(templatesRef, editingSessionData.id), editingSessionData);
                                                    } else {
                                                        await addDoc(templatesRef, {
                                                            ...editingSessionData,
                                                            id: Math.random().toString(36).substr(2, 9)
                                                        });
                                                    }
                                                    setIsEditingSession(false);
                                                    setEditingSessionData(null);
                                                } catch (err) {
                                                    console.error("Error saving template:", err);
                                                    alert("Ошибка при сохранении");
                                                }
                                            }}
                                            className="flex-1 py-4 bg-sparta-gold text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-sparta-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Сохранить
                                        </button>
                                    </div>
                                    {editingSessionData?.id && (
                                        <button
                                            onClick={async () => {
                                                if (!groupId || !editingSessionData?.id) return;
                                                if (window.confirm("Удалить этот шаблон тренировки?")) {
                                                    try {
                                                        await deleteDoc(doc(db, 'groups', groupId, 'training_templates', editingSessionData.id));
                                                        setIsEditingSession(false);
                                                        setEditingSessionData(null);
                                                    } catch (err) {
                                                        console.error("Error deleting template:", err);
                                                    }
                                                }
                                            }}
                                            className="w-full py-3 text-red-500/40 hover:text-red-500 text-[9px] font-black uppercase tracking-[0.2em] transition-all"
                                        >
                                            Удалить тренировку
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSessions.map(session => (
                                        <div key={session.id} className="relative group/item">
                                            <button
                                                onClick={() => handleSendTrainingCard(session)}
                                                className="w-full text-left p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-sparta-gold/50 hover:bg-sparta-gold/5 transition-all group pr-12"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-sparta-gold/10 text-sparta-gold">
                                                            <Trophy size={14} />
                                                        </div>
                                                        <span className="font-russo text-white uppercase text-sm">{session.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-sparta-gold uppercase tracking-widest">{session.date}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[11px] text-muted">
                                                    <div className="flex items-center gap-1"><Clock size={12} /> {session.time}</div>
                                                    <div className="flex items-center gap-1"><MapPin size={12} /> {session.location}</div>
                                                </div>
                                            </button>

                                            {(isAdmin || isTrainer) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingSessionData(session);
                                                        setIsEditingSession(true);
                                                    }}
                                                    className="absolute top-1/2 -translate-y-1/2 right-4 p-2 bg-white/5 border border-white/10 text-white/50 rounded-xl opacity-60 group-hover/item:opacity-100 hover:text-sparta-gold hover:border-sparta-gold/30 hover:bg-sparta-gold/10 transition-all cursor-pointer"
                                                    title="Настройки сессии"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {(isAdmin || isTrainer) && (
                                        <button
                                            onClick={() => {
                                                setEditingSessionData({ name: '', date: '', time: '', location: '', coach: userProfile?.full_name || 'Тренер', capacity: 0, deadlineHours: 0, isRecurring: false });
                                                setIsEditingSession(true);
                                            }}
                                            className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-white/20 hover:text-sparta-gold hover:border-sparta-gold/50 transition-all flex items-center justify-center gap-2 mt-4"
                                        >
                                            <Plus size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Добавить тренировку</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Poll Modal */}
            <CreatePollModal
                isOpen={isPollModalOpen}
                onClose={() => setIsPollModalOpen(false)}
                groupId={groupId}
                chatId={chatId}
                isUnifiedChat={isUnifiedChat}
                user={user}
                userProfile={userProfile}
            />

            {/* Coach & Admin Announcement Modal */}
            <AnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={() => setIsAnnouncementModalOpen(false)}
                onSendAnnouncement={handleSendAnnouncement}
                isSending={isSending}
            />
        </div>
    );
};

export default GroupChat;

