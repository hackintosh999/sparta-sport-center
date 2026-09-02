import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Folder, Tag, Users, Clock, Dumbbell, UploadCloud, Paperclip, Video, Image as ImageIcon, Play, Check } from 'lucide-react';
import { supabase } from '../../../supabase';
import { db } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadExerciseMedia, fileToDataUrl } from '../../../utils/supabaseStorage';

export interface CreateExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (exerciseData: any) => Promise<void>;
    editingExercise?: any | null;
    coachId?: string;
    coachName?: string;
    collections?: any[];
    initialCollectionId?: string;
    categories?: Array<{ id: string; label: string }>;
}

const DEFAULT_FOOTBALL_CATEGORIES = [
    { id: 'dribbling', label: '⚽ Дриблинг и ведение' },
    { id: 'shooting', label: '🎯 Удары' },
    { id: 'passing', label: '🔄 Передачи и пас' },
    { id: 'warmup', label: '⚡ Разминка и координация' },
    { id: 'tactics', label: '🛡️ Тактика' },
    { id: 'goalkeeping', label: '🧤 Вратари' }
];

const AGE_QUICK_CHIPS = ['6–8 лет', '9–11 лет', '12–15 лет', 'Все возраста', '2016 г.р.', 'Спецгруппа'];
const COMMON_EQUIPMENT_CHIPS = ['⚽ Мячи', '🔶 Фишки', '🎽 Манишки', '🥅 Мини-ворота', '🚧 Барьеры', '🪜 Лесенка', '🚩 Стойки'];
const DURATION_PRESETS = [10, 15, 20, 30, 45];
const FOLDER_COLORS = ['#D4AF37', '#A855F7', '#3B82F6', '#10B981', '#EF4444', '#F59E0B'];
const TOPIC_EMOJIS = ['⚽', '🎯', '🔄', '⚡', '🛡️', '🧤', '🧠', '🏃', '🥅', '⏱', '🏆', '🔥'];

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingExercise,
    coachId,
    coachName,
    collections = [],
    initialCollectionId = 'all',
    categories = DEFAULT_FOOTBALL_CATEGORIES
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localCategories, setLocalCategories] = useState(categories && categories.length > 0 ? categories : DEFAULT_FOOTBALL_CATEGORIES);
    const [localCollections, setLocalCollections] = useState(collections);

    useEffect(() => {
        if (categories && categories.length > 0) {
            setLocalCategories(categories);
        }
    }, [categories]);

    useEffect(() => {
        if (collections && collections.length > 0) {
            setLocalCollections(collections);
        }
    }, [collections]);

    // Form fields
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(localCategories[0]?.id || 'dribbling');
    const [collectionId, setCollectionId] = useState('all');
    const [ageRange, setAgeRange] = useState('');
    const [durationMinutes, setDurationMinutes] = useState<number | ''>(15);
    const [equipmentInput, setEquipmentInput] = useState('');
    const [description, setDescription] = useState('');

    // Inline Topic & Folder Creator state
    const [isCreatingTopicInline, setIsCreatingTopicInline] = useState(false);
    const [inlineTopicName, setInlineTopicName] = useState('');
    const [inlineTopicEmoji, setInlineTopicEmoji] = useState('⚽');
    const [isSavingInlineTopic, setIsSavingInlineTopic] = useState(false);

    const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
    const [inlineFolderName, setInlineFolderName] = useState('');
    const [inlineFolderColor, setInlineFolderColor] = useState('#D4AF37');
    const [isSavingInlineFolder, setIsSavingInlineFolder] = useState(false);

    // Media State (Direct Device Files)
    const [mediaItems, setMediaItems] = useState<Array<{ id: string; url: string; type: 'photo' | 'video'; name?: string; file?: File }>>([]);
    const [isDragOverMedia, setIsDragOverMedia] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Reset or populate state on open
    useEffect(() => {
        if (!isOpen) return;

        setIsCreatingTopicInline(false);
        setIsCreatingFolderInline(false);
        setIsDragOverMedia(false);

        if (editingExercise) {
            setTitle(editingExercise.title || '');
            setCategory(editingExercise.category || localCategories[0]?.id || 'dribbling');
            setCollectionId(editingExercise.collectionId || 'all');
            setAgeRange(editingExercise.ageRange || '');
            setDurationMinutes(editingExercise.durationMinutes ?? 15);
            setDescription(editingExercise.description || '');

            if (Array.isArray(editingExercise.equipment)) {
                setEquipmentInput(editingExercise.equipment.join(', '));
            } else if (typeof editingExercise.equipment === 'string') {
                setEquipmentInput(editingExercise.equipment);
            } else {
                setEquipmentInput('');
            }

            if (editingExercise.mediaItems && editingExercise.mediaItems.length > 0) {
                setMediaItems(editingExercise.mediaItems.map((item: any, idx: number) => {
                    const isVid = item.type === 'video' || (item.url && item.url.match(/\.(mp4|mov|webm|ogg)$/i));
                    return {
                        id: item.id || `item-${idx}`,
                        url: item.url,
                        type: isVid ? 'video' : 'photo',
                        name: item.name || `Файл ${idx + 1}`
                    };
                }));
            } else if (editingExercise.mediaUrl) {
                const isVid = editingExercise.mediaType === 'video' || editingExercise.mediaUrl.match(/\.(mp4|mov|webm|ogg)$/i);
                setMediaItems([{
                    id: 'init-1',
                    url: editingExercise.mediaUrl,
                    type: isVid ? 'video' : 'photo',
                    name: 'Медиа файл'
                }]);
            } else {
                setMediaItems([]);
            }
        } else {
            setTitle('');
            setCategory(localCategories[0]?.id || 'dribbling');
            setCollectionId(initialCollectionId !== 'all' ? initialCollectionId : 'all');
            setAgeRange('');
            setDurationMinutes(15);
            setEquipmentInput('');
            setDescription('');
            setMediaItems([]);
        }
    }, [isOpen, editingExercise, initialCollectionId, localCategories]);

    if (!isOpen) return null;

    // Helper for equipment quick chips
    const handleAddEquipmentChip = (chip: string) => {
        const cleanChip = chip.trim();
        const currentItems = equipmentInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (currentItems.includes(cleanChip)) {
            const filtered = currentItems.filter(s => s !== cleanChip);
            setEquipmentInput(filtered.join(', '));
        } else {
            const updated = [...currentItems, cleanChip];
            setEquipmentInput(updated.join(', '));
        }
    };

    // Create Topic Inline
    const handleSaveInlineTopic = async () => {
        if (!inlineTopicName.trim()) return;
        setIsSavingInlineTopic(true);
        try {
            const topicLabel = `${inlineTopicEmoji} ${inlineTopicName.trim()}`;
            const docRef = await addDoc(collection(db, "exercise_topics"), {
                label: inlineTopicName.trim(),
                icon: inlineTopicEmoji,
                coachId: coachId || 'system',
                isCustom: true,
                deleted: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            const newTopicObj = { id: docRef.id, label: topicLabel };
            setLocalCategories(prev => [...prev, newTopicObj]);
            setCategory(docRef.id);
            setInlineTopicName('');
            setIsCreatingTopicInline(false);
        } catch (err) {
            console.error("Error creating inline topic:", err);
            alert("Ошибка при создании темы");
        } finally {
            setIsSavingInlineTopic(false);
        }
    };

    // Create Folder Inline
    const handleSaveInlineFolder = async () => {
        if (!inlineFolderName.trim()) return;
        setIsSavingInlineFolder(true);
        try {
            const docRef = await addDoc(collection(db, "exercise_collections"), {
                title: inlineFolderName.trim(),
                color: inlineFolderColor,
                coachId: coachId || 'coach',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            const newColObj = { id: docRef.id, title: inlineFolderName.trim(), color: inlineFolderColor };
            setLocalCollections(prev => [...prev, newColObj]);
            setCollectionId(docRef.id);
            setInlineFolderName('');
            setIsCreatingFolderInline(false);
        } catch (err) {
            console.error("Error creating inline folder:", err);
            alert("Ошибка при создании папки");
        } finally {
            setIsSavingInlineFolder(false);
        }
    };

    // Direct files upload handler
    const handleAddFiles = (filesList: FileList | File[]) => {
        const files = Array.from(filesList);
        if (files.length === 0) return;

        const remainingSlots = 6 - mediaItems.length;
        if (remainingSlots <= 0) {
            alert('Максимально можно прикрепить до 6 файлов');
            return;
        }

        const filesToAdd = files.slice(0, remainingSlots);
        const newItems = filesToAdd.map((file) => {
            const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|ogg)$/i);
            return {
                id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                url: URL.createObjectURL(file),
                type: (isVid ? 'video' : 'photo') as 'video' | 'photo',
                name: file.name,
                file
            };
        });

        setMediaItems(prev => [...prev, ...newItems]);
    };

    const handleRemoveMediaItem = (id: string) => {
        setMediaItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            alert('Пожалуйста, введите название упражнения');
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            const processedMediaItems: any[] = [];
            const filesToUpload = mediaItems.filter(item => item.file);
            let uploadedSoFar = 0;

            // 1. Upload direct device files using robust multi-tier uploader
            for (const item of mediaItems) {
                if (item.file) {
                    let finalUrl = '';
                    try {
                        const uploadedUrl = await uploadExerciseMedia(item.file, 'exercises', coachId || 'coach');
                        if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
                            finalUrl = uploadedUrl;
                        }
                    } catch (uploadErr) {
                        console.warn('Storage upload error:', uploadErr);
                    }

                    // Failsafe 100% guarantee: if storage returned nothing, encode to compressed DataURL
                    if (!finalUrl) {
                        finalUrl = await fileToDataUrl(item.file);
                    }

                    if (finalUrl) {
                        processedMediaItems.push({
                            url: finalUrl,
                            type: item.type,
                            name: item.name || item.file.name
                        });
                    }

                    uploadedSoFar++;
                    if (filesToUpload.length > 0) {
                        setUploadProgress(Math.round((uploadedSoFar / filesToUpload.length) * 100));
                    }
                } else if (item.url && !item.url.startsWith('blob:')) {
                    processedMediaItems.push({
                        url: item.url,
                        type: item.type || 'photo',
                        name: item.name
                    });
                }
            }

            const hasVideo = processedMediaItems.some(i => i.type === 'video');
            const finalMediaType: 'video' | 'photo' = hasVideo ? 'video' : 'photo';
            const finalMediaUrl = processedMediaItems.length > 0 ? processedMediaItems[0].url : '';

            const parsedEquipment = equipmentInput
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            const payload = {
                title: title.trim(),
                category,
                categoryLabel: localCategories.find(c => c.id === category)?.label || category,
                ageRange: ageRange.trim(),
                durationMinutes: durationMinutes === '' ? 15 : Number(durationMinutes),
                collectionId: collectionId || 'all',
                equipment: parsedEquipment,
                description: description.trim(),
                mediaType: finalMediaType,
                mediaUrl: finalMediaUrl,
                videoUrl: hasVideo ? finalMediaUrl : '',
                mediaItems: processedMediaItems,
                coachId: coachId || 'coach',
                coachName: coachName || 'Тренер'
            };

            await onSave(payload);
            onClose();
        } catch (err: any) {
            console.error('Failed to save exercise:', err);
            alert(`Ошибка при сохранении: ${err.message || 'Попробуйте снова'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto custom-scrollbar">
                {/* Backdrop */}
                <div className="fixed inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    className="relative w-full max-w-2xl bg-[#141416] border border-amber-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.1)] overflow-hidden flex flex-col my-auto z-10"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-base">
                                ⚽
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-tight">
                                    {editingExercise ? 'Редактирование упражнения' : 'Новое упражнение'}
                                </h3>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all border border-white/10 cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form Body - Compact 5 Rows Layout */}
                    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                        {/* Row 1: Title */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
                                Название упражнения <span className="text-amber-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Введите название упражнения"
                                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-all font-bold placeholder:text-zinc-500"
                            />
                        </div>

                        {/* Row 2: Unified Device Media Upload Zone */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Paperclip size={13} /> Фото схемы или видео с устройства ({mediaItems.length}/6)
                                </label>
                                <span className="text-[10px] text-zinc-500 font-medium">
                                    JPG, PNG, WEBP, MP4, MOV
                                </span>
                            </div>

                            {/* Drop Zone / Attachments Grid */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOverMedia(true);
                                }}
                                onDragLeave={() => setIsDragOverMedia(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragOverMedia(false);
                                    if (e.dataTransfer.files) {
                                        handleAddFiles(e.dataTransfer.files);
                                    }
                                }}
                                className={`p-3 rounded-2xl border transition-all ${
                                    isDragOverMedia
                                        ? 'border-amber-400 bg-amber-400/10 shadow-lg'
                                        : 'border-dashed border-white/20 bg-black/40 hover:border-white/30'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            handleAddFiles(e.target.files);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                />

                                {mediaItems.length === 0 ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="py-5 flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 group-hover:bg-amber-400/20 group-hover:text-amber-300 text-zinc-400 flex items-center justify-center transition-all">
                                            <UploadCloud size={20} />
                                        </div>
                                        <div className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                                            📎 Нажмите для выбора фото или видео с устройства
                                        </div>
                                        <div className="text-[10px] text-zinc-500">
                                            или перетащите файлы сюда (до 6 шт.)
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {mediaItems.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/15 group shadow-md"
                                            >
                                                {item.type === 'video' ? (
                                                    <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center relative">
                                                        <video
                                                            src={item.url}
                                                            className="w-full h-full object-cover opacity-60"
                                                            preload="metadata"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-7 h-7 rounded-full bg-sparta-gold text-black flex items-center justify-center shadow-md">
                                                                <Play size={12} className="ml-0.5 fill-black" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-black text-amber-300 uppercase">
                                                            ▶ Видео
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={item.url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveMediaItem(item.id);
                                                    }}
                                                    className="absolute top-1 right-1 p-1 rounded-md bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
                                                    title="Удалить файл"
                                                >
                                                    <X size={11} />
                                                </button>
                                                <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[8px] font-bold text-white">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                        ))}

                                        {mediaItems.length < 6 && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-amber-400/60 hover:bg-amber-400/5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-zinc-400 hover:text-amber-300"
                                            >
                                                <Plus size={16} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">+ Файл</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Folder (left) & Football Topic (right) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Folder */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                        <Folder size={12} className="text-purple-400" /> Папка
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingFolderInline(!isCreatingFolderInline)}
                                        className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                                    >
                                        {isCreatingFolderInline ? '✕ Отмена' : '+ Новая папка'}
                                    </button>
                                </div>

                                <select
                                    value={collectionId}
                                    onChange={(e) => {
                                        if (e.target.value === '__new_folder__') {
                                            setIsCreatingFolderInline(true);
                                        } else {
                                            setCollectionId(e.target.value);
                                        }
                                    }}
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition-all cursor-pointer truncate font-medium"
                                >
                                    <option value="all" className="bg-zinc-900 text-white">📁 Общий каталог (Без папки)</option>
                                    {localCollections.map(col => (
                                        <option key={col.id} value={col.id} className="bg-zinc-900 text-white">
                                            📁 {col.title}
                                        </option>
                                    ))}
                                    <option value="__new_folder__" className="bg-zinc-900 text-amber-400 font-bold">
                                        ➕ Создать новую папку...
                                    </option>
                                </select>

                                {/* Inline Folder Creator */}
                                {isCreatingFolderInline && (
                                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2 mt-1">
                                        <input
                                            type="text"
                                            value={inlineFolderName}
                                            onChange={(e) => setInlineFolderName(e.target.value)}
                                            placeholder="Название новой папки"
                                            className="w-full bg-black/70 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-400"
                                        />
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1">
                                                {FOLDER_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setInlineFolderColor(c)}
                                                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${inlineFolderColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSaveInlineFolder}
                                                disabled={isSavingInlineFolder || !inlineFolderName.trim()}
                                                className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-[10px] font-bold uppercase transition-all disabled:opacity-40 cursor-pointer"
                                            >
                                                {isSavingInlineFolder ? '...' : 'Создать'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Topic */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                        <Tag size={12} className="text-amber-400" /> Тема
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingTopicInline(!isCreatingTopicInline)}
                                        className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                                    >
                                        {isCreatingTopicInline ? '✕ Отмена' : '+ Новая тема'}
                                    </button>
                                </div>

                                <select
                                    value={category}
                                    onChange={(e) => {
                                        if (e.target.value === '__new_topic__') {
                                            setIsCreatingTopicInline(true);
                                        } else {
                                            setCategory(e.target.value);
                                        }
                                    }}
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition-all cursor-pointer truncate font-medium"
                                >
                                    {localCategories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                                            {cat.label}
                                        </option>
                                    ))}
                                    <option value="__new_topic__" className="bg-zinc-900 text-amber-400 font-bold">
                                        ➕ Создать новую тему...
                                    </option>
                                </select>

                                {/* Inline Topic Creator */}
                                {isCreatingTopicInline && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-1">
                                        <input
                                            type="text"
                                            value={inlineTopicName}
                                            onChange={(e) => setInlineTopicName(e.target.value)}
                                            placeholder="Название новой темы"
                                            className="w-full bg-black/70 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                        />
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
                                                {TOPIC_EMOJIS.slice(0, 6).map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setInlineTopicEmoji(emoji)}
                                                        className={`w-5 h-5 rounded text-xs flex items-center justify-center cursor-pointer ${inlineTopicEmoji === emoji ? 'bg-amber-400 text-black font-bold' : 'bg-white/5'}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSaveInlineTopic}
                                                disabled={isSavingInlineTopic || !inlineTopicName.trim()}
                                                className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[10px] font-black uppercase transition-all disabled:opacity-40 cursor-pointer"
                                            >
                                                {isSavingInlineTopic ? '...' : 'Создать'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Age, Duration, Inventory (3 columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Age */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={12} className="text-blue-400" /> Возраст
                                </label>
                                <input
                                    type="text"
                                    value={ageRange}
                                    onChange={(e) => setAgeRange(e.target.value)}
                                    placeholder="Укажите возраст"
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition-all placeholder:text-zinc-500 font-medium"
                                />
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {AGE_QUICK_CHIPS.slice(0, 4).map(chip => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => setAgeRange(chip)}
                                            className={`px-1.5 py-0.5 rounded-lg text-[9px] font-semibold transition-all cursor-pointer border ${
                                                ageRange === chip
                                                    ? 'bg-blue-500/30 text-blue-300 border-blue-400/60 font-bold'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} className="text-emerald-400" /> Время (мин)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                                    placeholder="15"
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none transition-all font-bold placeholder:text-zinc-500"
                                />
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {DURATION_PRESETS.slice(0, 4).map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setDurationMinutes(preset)}
                                            className={`px-1.5 py-0.5 rounded-lg text-[9px] font-semibold transition-all cursor-pointer border ${
                                                durationMinutes === preset
                                                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/60 font-bold'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {preset}м
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inventory */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                    <Dumbbell size={12} className="text-amber-400" /> Инвентарь
                                </label>
                                <input
                                    type="text"
                                    value={equipmentInput}
                                    onChange={(e) => setEquipmentInput(e.target.value)}
                                    placeholder="Через запятую"
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition-all placeholder:text-zinc-500 font-medium"
                                />
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {COMMON_EQUIPMENT_CHIPS.slice(0, 3).map(chip => {
                                        const isAdded = equipmentInput.split(',').map(s => s.trim()).includes(chip);
                                        return (
                                            <button
                                                type="button"
                                                key={chip}
                                                onClick={() => handleAddEquipmentChip(chip)}
                                                className={`px-1.5 py-0.5 rounded-lg text-[9px] font-semibold transition-all cursor-pointer border ${
                                                    isAdded
                                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                                                        : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white'
                                                }`}
                                            >
                                                {chip}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Row 5: Description */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
                                Описание и правила расстановки
                            </label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Опишите правила и расстановку"
                                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl p-3 text-white text-xs outline-none transition-all resize-none shadow-inner leading-relaxed placeholder:text-zinc-500"
                            />
                        </div>

                        {/* Footer (Fixed inside modal) */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            >
                                Отмена
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim()}
                                className="px-6 py-2.5 rounded-xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Сохранение {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}...</span>
                                    </>
                                ) : (
                                    <span>{editingExercise ? 'Сохранить изменения' : '💾 Сохранить упражнение'}</span>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateExerciseModal;
