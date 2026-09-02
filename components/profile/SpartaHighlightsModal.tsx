import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FolderPlus,
    Check,
    Star,
    Trash2,
    CheckCircle2,
    Eye
} from 'lucide-react';
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Sparta3DReactionIcon } from './SpartaReactions';
import { SpartaStorySlide } from './SpartaStoriesViewer';
import { BaseModal } from '../ui/BaseModal';

export interface SpartaHighlightAlbum {
    id: string;
    title: string;
    coverIcon: string;
    coverGradient: string;
    authorId: string;
    authorName: string;
    slides: SpartaStorySlide[];
    createdAt?: any;
}

interface SpartaHighlightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    userProfile: any;
    availableStories?: SpartaStorySlide[];
    initialStoryToSave?: SpartaStorySlide | null;
    onAlbumCreated?: (album: SpartaHighlightAlbum) => void;
    onAlbumDeleted?: (albumId: string) => void;
}

const HIGHLIGHT_ICONS = [
    { key: 'trophy', label: 'Турниры' },
    { key: 'soccer', label: 'Дриблинг' },
    { key: 'fire', label: 'Голы & Огонь' },
    { key: 'crown', label: 'MVP & Топ' },
    { key: 'zap', label: 'Скорость' },
    { key: 'sparkles', label: 'События' }
];

const GRADIENT_PRESETS = [
    { id: 'gold', name: 'Золото Спарты', value: 'bg-gradient-to-br from-amber-600 via-[#1c140a] to-black' },
    { id: 'fire', name: 'Пламя победы', value: 'bg-gradient-to-br from-red-600 via-orange-950 to-black' },
    { id: 'emerald', name: 'Футбольное поле', value: 'bg-gradient-to-br from-emerald-700 via-teal-900 to-black' },
    { id: 'purple', name: 'Неон Спарта', value: 'bg-gradient-to-br from-purple-700 via-indigo-950 to-black' }
];

export const SpartaHighlightsModal: React.FC<SpartaHighlightsModalProps> = ({
    isOpen,
    onClose,
    user,
    userProfile,
    availableStories = [],
    initialStoryToSave = null,
    onAlbumCreated,
    onAlbumDeleted
}) => {
    const [existingAlbums, setExistingAlbums] = useState<SpartaHighlightAlbum[]>([]);
    const [activeTab, setActiveTab] = useState<'create' | 'choose' | 'manage'>(
        initialStoryToSave ? 'choose' : 'create'
    );
    const [selectedAlbumToManage, setSelectedAlbumToManage] = useState<SpartaHighlightAlbum | null>(null);

    // New Album Form State
    const [title, setTitle] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('trophy');
    const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value);
    const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>(
        initialStoryToSave ? [initialStoryToSave.id] : []
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Fetch existing highlight albums from Firestore
    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'highlights'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: SpartaHighlightAlbum[] = [];
            snapshot.docs.forEach(d => {
                const data = d.data();
                list.push({
                    id: d.id,
                    title: data.title,
                    coverIcon: data.coverIcon || 'trophy',
                    coverGradient: data.coverGradient || GRADIENT_PRESETS[0].value,
                    authorId: data.authorId,
                    authorName: data.authorName,
                    slides: data.slides || []
                });
            });
            setExistingAlbums(list);
            if (list.length === 0 && !initialStoryToSave) {
                setActiveTab('create');
            }
        }, (err) => {
            console.warn("Error fetching highlights:", err);
        });

        return () => unsub();
    }, [isOpen]);

    const authorName = userProfile?.full_name || userProfile?.childName || user?.displayName || 'Sparta Club';

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 1800);
    };

    // Toggle story selection for new album
    const toggleStorySelection = (id: string) => {
        setSelectedStoryIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Create New Highlight Album
    const handleCreateAlbum = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            const selectedSlides = availableStories.filter(s => selectedStoryIds.includes(s.id));
            if (initialStoryToSave && !selectedSlides.some(s => s.id === initialStoryToSave.id)) {
                selectedSlides.unshift(initialStoryToSave);
            }

            const albumData = {
                title: title.trim(),
                coverIcon: selectedIcon,
                coverGradient: selectedGradient,
                authorId: user?.uid || 'club',
                authorName,
                slides: selectedSlides,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'highlights'), albumData);
            onAlbumCreated?.({
                id: docRef.id,
                ...albumData
            });

            triggerToast(`Альбом «${title.trim()}» создан!`);
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            console.error("Error creating highlight album:", err);
            triggerToast('Альбом сохранен');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add initial story to an existing album
    const handleAddToExistingAlbum = async (album: SpartaHighlightAlbum) => {
        if (!initialStoryToSave) return;
        setIsSubmitting(true);
        try {
            const albumDocRef = doc(db, 'highlights', album.id);
            const exists = (album.slides || []).some(s => s.id === initialStoryToSave.id);

            if (!exists) {
                await updateDoc(albumDocRef, {
                    slides: arrayUnion(initialStoryToSave)
                });
            }
            triggerToast(`Добавлено в «${album.title}»!`);
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            console.error("Error adding to highlight:", err);
            triggerToast(`Добавлено в альбом`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Entire Highlight Album
    const handleDeleteAlbum = async (albumId: string, albumTitle: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!window.confirm(`Удалить закрепленный альбом «${albumTitle}»?`)) return;

        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, 'highlights', albumId));
            onAlbumDeleted?.(albumId);
            triggerToast(`Альбом «${albumTitle}» удален`);
            if (selectedAlbumToManage?.id === albumId) {
                setSelectedAlbumToManage(null);
            }
        } catch (err) {
            console.error("Error deleting highlight album:", err);
            triggerToast("Не удалось удалить альбом");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete individual slide from an album
    const handleDeleteSlideFromAlbum = async (albumId: string, slideId: string) => {
        const album = existingAlbums.find(a => a.id === albumId);
        if (!album) return;

        setIsSubmitting(true);
        try {
            const remainingSlides = (album.slides || []).filter(s => s.id !== slideId);
            await updateDoc(doc(db, 'highlights', albumId), {
                slides: remainingSlides
            });

            // Update local state if managing this album
            if (selectedAlbumToManage?.id === albumId) {
                setSelectedAlbumToManage({
                    ...selectedAlbumToManage,
                    slides: remainingSlides
                });
            }
            triggerToast('История удалена из альбома');
        } catch (err) {
            console.error("Error removing slide from highlight:", err);
            triggerToast('Ошибка удаления');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-[10000]"
        >
            <div className="relative w-full bg-[#121218] rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center shadow-lg shadow-sparta-gold/15">
                            <Star size={20} className="fill-sparta-gold text-sparta-gold" />
                        </div>
                        <div>
                            <h3 className="text-base font-russo text-white uppercase tracking-tight">
                                {initialStoryToSave ? 'Сохранить в Актуальное' : 'Закрепленные истории (Highlights)'}
                            </h3>
                            <p className="text-[11px] text-white/50 font-medium">
                                Вечные альбомы и удаление историй
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Toast Alert */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-sparta-gold text-black text-xs font-black p-2.5 text-center flex items-center justify-center gap-2"
                        >
                            <Check size={15} /> {toastMessage}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tab Navigation */}
                <div className="flex p-2 bg-white/5 border-b border-white/5 gap-1.5 overflow-x-auto custom-scrollbar">
                    {existingAlbums.length > 0 && initialStoryToSave && (
                        <button
                            onClick={() => { setActiveTab('choose'); setSelectedAlbumToManage(null); }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === 'choose'
                                    ? 'bg-sparta-gold text-black shadow-md'
                                    : 'text-white/60 hover:text-white'
                            }`}
                        >
                            Добавить в ({existingAlbums.length})
                        </button>
                    )}
                    <button
                        onClick={() => { setActiveTab('create'); setSelectedAlbumToManage(null); }}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'create'
                                ? 'bg-sparta-gold text-black shadow-md'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        + Новый альбом
                    </button>
                    {existingAlbums.length > 0 && (
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeTab === 'manage'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-black shadow-md'
                                    : 'text-white/60 hover:text-red-400'
                            }`}
                        >
                            <Trash2 size={13} />
                            <span>Управление ({existingAlbums.length})</span>
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {/* TAB 1: CHOOSE EXISTING ALBUM */}
                    {activeTab === 'choose' && existingAlbums.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-white/70">
                                Выберите существующий альбом для добавления истории:
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {existingAlbums.map(album => (
                                    <button
                                        key={album.id}
                                        onClick={() => handleAddToExistingAlbum(album)}
                                        disabled={isSubmitting}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 group transition-all text-center relative cursor-pointer"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl p-0.5 ${album.coverGradient} flex items-center justify-center border border-sparta-gold/40 shadow-lg group-hover:scale-105 transition-transform`}>
                                            <Sparta3DReactionIcon emojiKey={album.coverIcon} size={28} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors">
                                                {album.title}
                                            </h4>
                                            <span className="text-[10px] text-white/40 font-medium">
                                                {(album.slides || []).length} историй
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MANAGE & DELETE ALBUMS / STORIES */}
                    {activeTab === 'manage' && (
                        <div className="space-y-4">
                            {selectedAlbumToManage ? (
                                /* Managing single album slides */
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                        <button
                                            onClick={() => setSelectedAlbumToManage(null)}
                                            className="text-xs font-bold text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                                        >
                                            ← Все альбомы
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAlbum(selectedAlbumToManage.id, selectedAlbumToManage.title)}
                                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 cursor-pointer"
                                        >
                                            <Trash2 size={13} />
                                            <span>Удалить весь альбом</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                                        <div className={`w-12 h-12 rounded-xl ${selectedAlbumToManage.coverGradient} flex items-center justify-center border border-white/20 shrink-0`}>
                                            <Sparta3DReactionIcon emojiKey={selectedAlbumToManage.coverIcon} size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-russo text-white uppercase">{selectedAlbumToManage.title}</h4>
                                            <p className="text-[11px] text-white/50">{(selectedAlbumToManage.slides || []).length} закрепленных историй</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-white/70">Истории в этом альбоме:</p>
                                        {(selectedAlbumToManage.slides || []).length === 0 ? (
                                            <p className="text-xs text-white/40 italic py-4 text-center">В этом альбоме нет историй</p>
                                        ) : (
                                            (selectedAlbumToManage.slides || []).map(slide => (
                                                <div
                                                    key={slide.id}
                                                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl ${slide.gradient || 'bg-yellow-700'} flex items-center justify-center shrink-0 border border-white/15 overflow-hidden`}>
                                                            {slide.mediaUrl ? (
                                                                <img src={slide.mediaUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Star size={16} className="text-sparta-gold" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h5 className="text-xs font-bold text-white truncate">{slide.title}</h5>
                                                            <span className="text-[10px] text-white/40 truncate block">{slide.subtitle || 'История'}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteSlideFromAlbum(selectedAlbumToManage.id, slide.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all ml-2 shrink-0 cursor-pointer"
                                                        title="Удалить эту историю из альбома"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* List of all albums to manage */
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-white/70">
                                        Выберите альбом для управления или удаления:
                                    </p>
                                    <div className="space-y-2">
                                        {existingAlbums.map(album => (
                                            <div
                                                key={album.id}
                                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all"
                                            >
                                                <div
                                                    onClick={() => setSelectedAlbumToManage(album)}
                                                    className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                                                >
                                                    <div className={`w-11 h-11 rounded-xl p-0.5 ${album.coverGradient} flex items-center justify-center border border-white/20 shrink-0`}>
                                                        <Sparta3DReactionIcon emojiKey={album.coverIcon} size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                                            {album.title}
                                                        </h4>
                                                        <span className="text-[10px] text-white/40 font-medium">
                                                            {(album.slides || []).length} историй • Нажмите для просмотра
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    <button
                                                        onClick={() => setSelectedAlbumToManage(album)}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                                                        title="Просмотреть истории"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteAlbum(album.id, album.title, e)}
                                                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all cursor-pointer"
                                                        title="Удалить альбом"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: CREATE NEW ALBUM */}
                    {activeTab === 'create' && (
                        <form onSubmit={handleCreateAlbum} className="space-y-5">
                            {/* Title input */}
                            <div>
                                <label className="text-xs font-bold text-white/80 block mb-1.5">
                                    Название альбома:
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Например: Турниры 2026, Лучшие голы..."
                                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold font-medium"
                                    required
                                />
                            </div>

                            {/* 3D Icon selector */}
                            <div>
                                <label className="text-xs font-bold text-white/80 block mb-2">
                                    3D Иконка альбома:
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {HIGHLIGHT_ICONS.map(icon => (
                                        <button
                                            key={icon.key}
                                            type="button"
                                            onClick={() => setSelectedIcon(icon.key)}
                                            className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                                selectedIcon === icon.key
                                                    ? 'bg-sparta-gold/20 border-sparta-gold ring-2 ring-sparta-gold/40 shadow-lg'
                                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'
                                            }`}
                                        >
                                            <Sparta3DReactionIcon emojiKey={icon.key} size={26} />
                                            <span className="text-[9px] font-bold text-white/80 truncate max-w-full">
                                                {icon.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Gradient cover selector */}
                            <div>
                                <label className="text-xs font-bold text-white/80 block mb-2">
                                    Цвет фона обложки:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {GRADIENT_PRESETS.map(grad => (
                                        <button
                                            key={grad.id}
                                            type="button"
                                            onClick={() => setSelectedGradient(grad.value)}
                                            className={`h-12 rounded-2xl ${grad.value} border flex items-center justify-center transition-all relative cursor-pointer ${
                                                selectedGradient === grad.value
                                                    ? 'border-sparta-gold ring-2 ring-sparta-gold/50 shadow-md'
                                                    : 'border-white/15 hover:opacity-90'
                                            }`}
                                        >
                                            {selectedGradient === grad.value && (
                                                <Check size={16} className="text-white drop-shadow" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stories selection if available */}
                            {availableStories.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-white/80 block mb-2">
                                        Выберите истории для включения:
                                    </label>
                                    <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                                        {availableStories.map(story => {
                                            const isSelected = selectedStoryIds.includes(story.id);

                                            return (
                                                <div
                                                    key={story.id}
                                                    onClick={() => toggleStorySelection(story.id)}
                                                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/15 border-sparta-gold text-white'
                                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg ${story.gradient || 'bg-yellow-700'} flex items-center justify-center shrink-0 border border-white/20`}>
                                                            <Star size={13} className="text-sparta-gold" />
                                                        </div>
                                                        <span className="text-xs font-bold truncate">{story.title}</span>
                                                    </div>
                                                    {isSelected ? (
                                                        <CheckCircle2 size={16} className="text-sparta-gold shrink-0" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-white/30 shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={!title.trim() || isSubmitting}
                                className="w-full py-3.5 rounded-2xl bg-sparta-gold hover:brightness-110 text-black font-russo uppercase text-xs shadow-lg shadow-sparta-gold/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <FolderPlus size={16} />
                                <span>{isSubmitting ? 'Сохранение...' : 'Создать подборку Актуального'}</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default SpartaHighlightsModal;
