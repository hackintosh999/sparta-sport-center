import React from 'react';
import { Play, Layers, Image as ImageIcon } from 'lucide-react';

export interface ExerciseMediaItem {
    id?: string;
    url: string;
    type?: 'photo' | 'video' | 'url';
    file?: File;
    name?: string;
}

interface ExerciseMediaGridProps {
    mediaItems?: ExerciseMediaItem[] | string[] | any[];
    mediaUrl?: string;
    mediaType?: 'photo' | 'video' | 'url';
    title: string;
    durationMinutes?: number;
    onOpenLightbox: (index: number) => void;
    className?: string;
}

export const extractYoutubeId = (url?: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^& \n<#]+)/);
    return match ? match[1] : null;
};

const normalizeUrl = (raw: any): string => {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    return raw.url || raw.photoUrl || raw.src || raw.downloadUrl || '';
};

const normalizeType = (raw: any): 'photo' | 'video' | 'url' => {
    if (!raw) return 'photo';
    if (typeof raw === 'object' && raw.type) return raw.type;
    const url = normalizeUrl(raw);
    if (url.includes('youtube') || url.includes('youtu.be') || url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('video')) {
        return 'video';
    }
    return 'photo';
};

export const ExerciseMediaGrid: React.FC<ExerciseMediaGridProps> = ({
    mediaItems = [],
    mediaUrl,
    mediaType,
    title,
    durationMinutes,
    onOpenLightbox,
    className = ''
}) => {
    // Normalise items
    const allItems: ExerciseMediaItem[] = React.useMemo(() => {
        if (Array.isArray(mediaItems) && mediaItems.length > 0) {
            return mediaItems.map((item, idx) => ({
                id: (typeof item === 'object' && item.id) ? item.id : `item-${idx}`,
                url: normalizeUrl(item),
                type: normalizeType(item),
                name: (typeof item === 'object' && item.name) ? item.name : undefined
            })).filter(i => Boolean(i.url && i.url.trim() !== ''));
        }
        const singleUrl = normalizeUrl(mediaUrl);
        if (singleUrl) {
            return [{
                id: 'media-main',
                url: singleUrl,
                type: mediaType || normalizeType(singleUrl)
            }];
        }
        return [];
    }, [mediaItems, mediaUrl, mediaType]);

    // Check if main item is a video
    const firstItem = allItems[0];
    const isVideo = firstItem && (
        firstItem.type === 'video' ||
        firstItem.type === 'url' ||
        (firstItem.url && (firstItem.url.includes('youtube') || firstItem.url.includes('youtu.be') || firstItem.url.endsWith('.mp4') || firstItem.url.includes('rutube') || firstItem.url.includes('vk.com')))
    );

    // If no media at all
    if (allItems.length === 0) {
        return (
            <div className={`w-full h-48 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 flex flex-col items-center justify-center text-zinc-600 gap-2 ${className}`}>
                <ImageIcon size={32} className="opacity-40" />
                <span className="text-[11px] font-medium tracking-wide">Схема / фото не прикреплены</span>
            </div>
        );
    }

    // 1. VIDEO RENDERER
    if (isVideo) {
        const ytId = extractYoutubeId(firstItem.url);
        const posterUrl = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : undefined;

        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenLightbox(0);
                }}
                className={`w-full h-48 relative rounded-xl overflow-hidden bg-zinc-900 group cursor-pointer border border-white/10 shadow-lg ${className}`}
            >
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                    />
                ) : (firstItem.type === 'video' || firstItem.url.match(/\.(mp4|mov|webm|ogg)$/i) || firstItem.url.includes('exercises-media')) ? (
                    <video
                        src={firstItem.url}
                        className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-105"
                        preload="metadata"
                        muted
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <ImageIcon size={32} className="text-zinc-600" />
                    </div>
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Duration Badge */}
                {durationMinutes ? (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                        <span>⏱</span>
                        <span>{durationMinutes} мин</span>
                    </div>
                ) : null}

                {/* Play Button Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-sparta-gold text-black flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.5)] transform transition-transform duration-300 group-hover:scale-110">
                        <Play size={20} className="ml-0.5 fill-black" />
                    </div>
                </div>

                {/* Video Tag */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-bold uppercase tracking-wider">
                    📹 Видео-урок
                </div>
            </div>
        );
    }

    // 2. PHOTO COLLAGE RENDERER (1, 2, 3, 4+ photos)
    const photoItems = allItems.filter(item => item.type !== 'video' && item.type !== 'url');
    const totalPhotos = photoItems.length > 0 ? photoItems.length : allItems.length;
    const activeList = photoItems.length > 0 ? photoItems : allItems;

    const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80';

    // A) Single photo
    if (totalPhotos === 1) {
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenLightbox(0);
                }}
                className={`w-full h-48 relative rounded-xl overflow-hidden bg-zinc-900 group cursor-pointer border border-white/10 shadow-lg ${className}`}
            >
                <img
                    src={activeList[0]?.url || FALLBACK_PHOTO}
                    alt={title}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {durationMinutes ? (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-amber-300 text-[11px] font-bold shadow-md">
                        ⏱ {durationMinutes} мин
                    </div>
                ) : null}
            </div>
        );
    }

    // B) Two photos (50% / 50%)
    if (totalPhotos === 2) {
        return (
            <div className={`w-full h-48 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg ${className}`}>
                {activeList.slice(0, 2).map((item, idx) => (
                    <div
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenLightbox(idx);
                        }}
                        className="relative h-full w-full overflow-hidden group cursor-pointer bg-zinc-900"
                    >
                        <img
                            src={item?.url || FALLBACK_PHOTO}
                            alt={`${title} - ${idx + 1}`}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                ))}
            </div>
        );
    }

    // C) Three photos (Left 60%, Right 40% stacked 2)
    if (totalPhotos === 3) {
        return (
            <div className={`w-full h-48 grid grid-cols-5 gap-1.5 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg ${className}`}>
                {/* Large Left Item (60%) */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenLightbox(0);
                    }}
                    className="col-span-3 h-full relative overflow-hidden group cursor-pointer bg-zinc-900"
                >
                    <img
                        src={activeList[0]?.url || FALLBACK_PHOTO}
                        alt={`${title} - 1`}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                </div>

                {/* Stacked Right Column (40%) */}
                <div className="col-span-2 grid grid-rows-2 gap-1.5 h-full">
                    {activeList.slice(1, 3).map((item, idx) => (
                        <div
                            key={idx + 1}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenLightbox(idx + 1);
                            }}
                            className="relative h-full w-full overflow-hidden group cursor-pointer bg-zinc-900"
                        >
                            <img
                                src={item?.url || FALLBACK_PHOTO}
                                alt={`${title} - ${idx + 2}`}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
                                }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // D) Four or more photos (2x2 Grid with +N on 4th photo)
    const remainingCount = totalPhotos - 4;

    return (
        <div className={`w-full h-48 grid grid-cols-2 grid-rows-2 gap-1.5 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg ${className}`}>
            {activeList.slice(0, 4).map((item, idx) => {
                const isLastItem = idx === 3 && remainingCount > 0;

                return (
                    <div
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenLightbox(idx);
                        }}
                        className="relative h-full w-full overflow-hidden group cursor-pointer bg-zinc-900"
                    >
                        <img
                            src={item?.url || FALLBACK_PHOTO}
                            alt={`${title} - ${idx + 1}`}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                        {/* Telegram/VK Style +N Overlay on the 4th item */}
                        {isLastItem && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white transition-colors group-hover:bg-black/60">
                                <span className="text-xl sm:text-2xl font-russo text-amber-300">+{remainingCount + 1}</span>
                                <span className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase">фото</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ExerciseMediaGrid;
