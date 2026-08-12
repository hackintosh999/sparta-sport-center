import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Loader, X, Search, Clock, Save, Video, Radio } from 'lucide-react';
import { Broadcast } from '../../types/broadcast';

const getVideoEmbedUrl = (url: string) => {
    if (!url) return undefined;

    // YouTube
    const ytRegExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[1].length === 11) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // VK Video
    // Formats: 
    // vk.com/video-123_456
    // vk.ru/video-123_456
    // vkvideo.ru/video-123_456
    // live.vkvideo.ru/video-123_456
    // vk.com/...z=video-123_456
    const vkRegExp = /(?:vk\.com|vk\.ru|vkvideo\.ru|live\.vkvideo\.ru)\/(?:video|.*?z=video)(-?\d+)_(\d+)/;
    const vkMatch = url.match(vkRegExp);
    if (vkMatch) {
        // According to VK docs: vk.com/video_ext.php?oid={oid}&id={id}&hd=2&autoplay=1
        return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`;
    }

    // Direct embed link format check (if user pastes the embed code src directly)
    if (url.includes('video_ext.php')) {
        return url;
    }

    // Check if user pasted an entire iframe tag (common for VK "Export" feature)
    if (url.toLowerCase().includes('<iframe')) {
        const srcMatch = url.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
            return srcMatch[1];
        }
    }

    // Default return
    return url;
};

const AdminBroadcasts = () => {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [formData, setFormData] = useState<Partial<Broadcast>>({
        title: '',
        description: '',
        videoUrl: '',
        isLive: false,
        thumbnailUrl: '',
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Broadcast[];

            // Sort to put live broadcasts first
            data.sort((a, b) => {
                if (a.isLive === b.isLive) return 0;
                return a.isLive ? -1 : 1;
            });

            setBroadcasts(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setErrorMessage(`Ошибка доступа к БД: ${error.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenEditor = (item?: Broadcast) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                videoUrl: '',
                isLive: false,
                thumbnailUrl: '',
            });
        }
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.videoUrl) {
            setErrorMessage("Впишите заголовок и ссылку на видео");
            return;
        }

        const embedUrl = getVideoEmbedUrl(formData.videoUrl);

        const dataToSave = {
            ...formData,
            videoUrl: embedUrl || formData.videoUrl, // Use embed format if parsed, otherwise store raw
            date: formData.date || serverTimestamp(), // Ideally a real date picker, but using server time for now
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "broadcasts", editingId), {
                    ...dataToSave,
                    updatedAt: serverTimestamp()
                });
                setSuccessMessage("Трансляция обновлена!");
            } else {
                await addDoc(collection(db, "broadcasts"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Трансляция добавлена!");
            }
            setTimeout(() => {
                setSuccessMessage(null);
                handleCloseEditor();
            }, 1000);
        } catch (error: any) {
            console.error("Save error:", error);
            setErrorMessage("Ошибка сохранения: " + error.message);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Удалить трансляцию?")) {
            await deleteDoc(doc(db, "broadcasts", id));
        }
    };

    const filteredBroadcasts = broadcasts.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
            <Loader className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">SPARTA TV</h1>
                            <p className="text-white/40 text-sm">Управление прямыми трансляциями и архивом видео</p>
                        </div>
                        <button
                            onClick={() => handleOpenEditor()}
                            className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2 transform active:scale-95"
                        >
                            <Plus size={20} />
                            Новый эфир
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск трансляций..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:border-sparta-gold/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredBroadcasts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/10">
                                <Video size={32} />
                            </div>
                            <h3 className="text-white/40 font-bold">Трансляции не найдены</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredBroadcasts.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleOpenEditor(item)}
                                    className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border hover:border-sparta-gold/30 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${item.isLive ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}
                                >
                                    <div className="aspect-video relative bg-black">
                                        <iframe
                                            src={item.videoUrl}
                                            className="w-full h-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
                                            frameBorder="0"
                                        />
                                        {item.isLive && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1.5 animate-pulse">
                                                <Radio size={12} />
                                                LIVE
                                            </div>
                                        )}
                                        {!item.isLive && (
                                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white/70 text-[10px] font-bold px-2 py-1 rounded">
                                                АРХИВ
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-sparta-gold transition-colors">{item.title}</h3>
                                        {item.description && (
                                            <p className="text-white/40 text-xs line-clamp-2">{item.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        className="absolute top-3 left-3 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Drawer */}
            <div className={`fixed inset-y-0 right-0 w-[500px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {editingId ? <Edit2 size={20} className="text-sparta-gold" /> : <Plus size={20} className="text-sparta-gold" />}
                        {editingId ? 'Редактировать трансляцию' : 'Новая трансляция'}
                    </h2>
                    <button onClick={handleCloseEditor} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                    <form id="broadcast-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Status Toggle */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Radio size={16} className={formData.isLive ? "text-red-500 animate-pulse" : "text-white/40"} />
                                    СТАТУС: ПРЯМОЙ ЭФИР
                                </h3>
                                <p className="text-white/40 text-xs mt-1">Отобразить трансляцию на главной странице с пометкой LIVE</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isLive || false}
                                    onChange={(e) => setFormData({ ...formData, isLive: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                        </div>

                        {/* Video URL */}
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Ссылка на видео (YouTube / VK Video)</label>
                            <input
                                type="text"
                                value={formData.videoUrl}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, videoUrl: val });
                                }}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="https://youtube.com/... или https://vk.com/video..."
                            />
                            {formData.videoUrl && (
                                <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                                    <iframe
                                        src={getVideoEmbedUrl(formData.videoUrl) || formData.videoUrl}
                                        className="w-full h-full pointer-events-none"
                                        frameBorder="0"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Название трансляции</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="Например: Открытый кубок Спарты - Финал"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Описание (Опционально)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all resize-none"
                                placeholder="Краткое описание события..."
                            />
                        </div>

                        {errorMessage && (
                            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex flex-col gap-1">
                                <span className="text-red-500 font-bold text-sm">Ошибка</span>
                                <span className="text-white/70 text-sm whitespace-pre-wrap">{errorMessage}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex flex-col gap-1">
                                <span className="text-green-500 font-bold text-sm">Успешно</span>
                                <span className="text-white/70 text-sm">{successMessage}</span>
                            </div>
                        )}
                    </form>
                </div>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-white/10 bg-[#111] grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={handleCloseEditor}
                        className="py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        form="broadcast-form"
                        className="py-3 px-4 bg-sparta-gold hover:bg-[#ffd700] text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminBroadcasts;
