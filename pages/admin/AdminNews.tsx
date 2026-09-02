import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, storage } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, getDocs, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
    Plus, Trash2, Image as ImageIcon, Loader, Edit2, Pin, Tag, Clock,
    LayoutGrid, List, X, ChevronRight, Save, Search, Filter,
    MoreVertical, Eye, AlertCircle, CheckCircle, UploadCloud, RefreshCw, Key, Share2
} from 'lucide-react';
import RichTextEditor from '../../components/admin/RichTextEditor';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// --- Types ---
interface NewsItem {
    id: string;
    title: string;
    content: string;
    category: string;
    image: string;
    images: string[];
    imageOverlays?: string[];
    isPinned: boolean;
    status: 'published' | 'draft';
    tags: string[];
    poll: { question: string; options: string[] } | null;
    createdAt: any;
    readingTime: number;
    views: number;
    likes: number;
    video?: string; // URL video to upload or link
    videoType?: 'upload' | 'embed';
    vkId?: string;
    source?: 'sparta' | 'vkontakte';
    ownerId?: number;
    vkAttachments?: string;
}

const CATEGORIES = [
    { id: 'competitions', label: 'Соревнования', color: 'bg-blue-500' },
    { id: 'club_life', label: 'Жизнь клуба', color: 'bg-purple-500' },
    { id: 'tips', label: 'Советы тренера', color: 'bg-green-500' },
    { id: 'announcements', label: 'Объявления', color: 'bg-orange-500' }
];

const stripHtml = (html: string) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const getVideoEmbedUrl = (url: string) => {
    if (!url) return undefined;

    // YouTube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
        return `https://www.youtube.com/embed/${ytMatch[2]}`;
    }

    // VK Video
    const vkRegExp = /vk\.com\/video(-?\d+)_(\d+)/;
    const vkMatch = url.match(vkRegExp);
    if (vkMatch) {
        return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`;
    }

    return undefined;
};

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const isPublished = status === 'published';
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${isPublished
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {isPublished ? 'Опубликовано' : 'Черновик'}
        </span>
    );
};

const AdminNews = () => {
    // --- State ---
    const [news, setNews] = useState<NewsItem[]>([]);
    const [vkNews, setVkNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');
    const [isCleaning, setIsCleaning] = useState(false);

    // VK Token & Sync States
    const [vkToken, setVkToken] = useState<string>('');
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [tokenInput, setTokenInput] = useState('');
    const [isSyncingVk, setIsSyncingVk] = useState(false);

    // Editor State
    const [formData, setFormData] = useState<Partial<NewsItem>>({
        title: '',
        content: '',
        category: CATEGORIES[1].id,
        image: '',
        images: [],
        imageOverlays: [],
        isPinned: false,
        status: 'published',
        tags: [],
        poll: null,
        video: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // URL Params for deep linking edit
    const [searchParams, setSearchParams] = useSearchParams();

    // --- Handlers ---
    const fetchNews = async () => {
        setLoading(true);
        try {
            // Remove orderBy("createdAt") to ensure we fetch ALL docs, even those missing fields
            const q = query(collection(db, "news"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            // Client-side sort: Pinned first, then Newest
            data.sort((a: any, b: any) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setNews(data);
            setLoading(false);
        } catch (error: any) {
            console.error("Firestore Read Error:", error);
            setErrorMessage(`Ошибка доступа к БД: ${error.message}`);
            setLoading(false);
        }
    };

    // --- Effects & VK Token Management ---
    useEffect(() => {
        fetchNews();

        // Load local token initially
        const localToken = localStorage.getItem('vk_access_token') || '';
        if (localToken) {
            setVkToken(localToken);
            setTokenInput(localToken);
        }

        // Listen to Firestore system settings
        const unsub = onSnapshot(doc(db, 'system_settings', 'vk_config'), (snap) => {
            if (snap.exists() && snap.data()?.token) {
                const tokenVal = snap.data().token;
                setVkToken(tokenVal);
                setTokenInput(tokenVal);
                localStorage.setItem('vk_access_token', tokenVal);
            }
        });

        return () => unsub();
    }, []);

    const fetchVKNews = async (overrideToken?: string) => {
        setIsSyncingVk(true);
        try {
            const activeToken = overrideToken || vkToken || localStorage.getItem('vk_access_token') || '';
            const headers: Record<string, string> = {};
            if (activeToken) headers['x-vk-token'] = activeToken;

            const res = await fetch('/api/vk-news?count=20', { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.items) {
                    const mappedVkNews = data.items.map((post: any) => {
                        let imageUrl = '';
                        const images: string[] = [];
                        if (post.attachments) {
                            post.attachments.forEach((a: any) => {
                                if (a.type === 'photo' && a.photo && a.photo.sizes) {
                                    const sortedSizes = a.photo.sizes.sort((s1: any, s2: any) => s2.width - s1.width);
                                    if (sortedSizes.length > 0) {
                                        const url = sortedSizes[0].url;
                                        images.push(url);
                                        if (!imageUrl) imageUrl = url;
                                    }
                                }
                            });
                        }

                        const attachmentsStr = post.attachments?.map((a: any) => {
                            if (a.type === 'photo') return `photo${a.photo.owner_id}_${a.photo.id}`;
                            if (a.type === 'video') return `video${a.video.owner_id}_${a.video.id}`;
                            return '';
                        }).filter(Boolean).join(',') || '';

                        return {
                            id: `vk_${post.id}`,
                            vkId: String(post.id),
                            ownerId: post.owner_id,
                            vkAttachments: attachmentsStr,
                            title: post.text.split('\n')[0].substring(0, 100) + (post.text.length > 100 ? '...' : ''),
                            content: post.text,
                            image: imageUrl,
                            images: images,
                            category: 'club_life',
                            isPinned: post.is_pinned === 1,
                            status: 'published' as const,
                            tags: [],
                            poll: null,
                            createdAt: { seconds: post.date },
                            views: post.views?.count || 0,
                            likes: post.likes?.count || 0,
                            readingTime: Math.ceil(post.text.split(/\s+/).length / 200) || 1,
                            source: 'vkontakte' as const
                        };
                    });
                    setVkNews(mappedVkNews);

                    // Persist real VK posts into Firestore so they remain cached & available across all clients
                    mappedVkNews.forEach(async (vkItem) => {
                        if (vkItem.content && vkItem.title) {
                            try {
                                await setDoc(doc(db, 'news', vkItem.id), {
                                    title: vkItem.title,
                                    content: vkItem.content,
                                    image: vkItem.image,
                                    images: vkItem.images,
                                    category: vkItem.category || 'club_life',
                                    vkId: vkItem.vkId,
                                    ownerId: vkItem.ownerId,
                                    status: 'published',
                                    source: 'vkontakte',
                                    baseLikes: vkItem.likes,
                                    createdAt: { seconds: vkItem.createdAt?.seconds || Math.floor(Date.now() / 1000) }
                                }, { merge: true });
                            } catch (e) {
                                console.error('Error auto-syncing VK post to Firestore:', e);
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch VK news:", error);
        } finally {
            setIsSyncingVk(false);
        }
    };

    useEffect(() => {
        fetchVKNews();
    }, [vkToken]);

    const handleSaveVkToken = async () => {
        const cleanToken = tokenInput.trim();
        if (!cleanToken) return;
        try {
            await setDoc(doc(db, 'system_settings', 'vk_config'), {
                token: cleanToken,
                updatedAt: serverTimestamp()
            }, { merge: true });
            localStorage.setItem('vk_access_token', cleanToken);
            setVkToken(cleanToken);
            setIsTokenModalOpen(false);
            setSuccessMessage('Токен VK успешно сохранен!');
            fetchVKNews(cleanToken);
        } catch (err) {
            console.error('Error saving VK token:', err);
            setErrorMessage('Ошибка сохранения токена VK');
        }
    };

    // Handle Edit ID from URL
    useEffect(() => {
        const editIdParams = searchParams.get('editId');
        if (editIdParams && news.length > 0 && !isEditorOpen) {
            const foundNews = news.find(n => n.id === editIdParams);
            if (foundNews) {
                handleOpenEditor(foundNews);
                // Clear param after opening
                setSearchParams({}, { replace: true });
            }
        }
    }, [news, searchParams, isEditorOpen]);

    // --- Handlers ---

    const handleOpenEditor = (item?: NewsItem) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                content: '',
                category: CATEGORIES[1].id,
                image: '',
                images: [],
                imageOverlays: [],
                isPinned: false,
                status: 'published',
                tags: [],
                poll: null,
                video: '',
                vkId: undefined,
                source: 'sparta'
            });
        }
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingId(null);
        setUploadProgress(0);
        setIsUploading(false);
    };

    // Helper to resize image to prevent huge Base64 strings, and auto-enhance low-quality images
    const resizeImage = (file: File, maxWidth = 1200): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // If image is very small, we upscale it to prevent CSS pixelation on large screens
                    const minWidth = 1000;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else if (width < minWidth) {
                        height = Math.round((height * minWidth) / width);
                        width = minWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // High quality upscaling to smooth out pixels
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = "high";
                        ctx.drawImage(img, 0, 0, width, height);

                        // Subtle Contrast Boost to make colors less washed out
                        try {
                            const imageData = ctx.getImageData(0, 0, width, height);
                            const data = imageData.data;
                            const factor = (259 * (15 + 255)) / (255 * (259 - 15)); // +15% Contrast
                            for (let i = 0; i < data.length; i += 4) {
                                data[i] = factor * (data[i] - 128) + 128;     // R
                                data[i + 1] = factor * (data[i + 1] - 128) + 128; // G
                                data[i + 2] = factor * (data[i + 2] - 128) + 128; // B
                            }
                            ctx.putImageData(imageData, 0, 0);
                        } catch (err) {
                            console.warn("Failed to apply contrast boost:", err);
                        }

                        // Compress to JPEG 0.85 quality for better visual clarity
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } else {
                        reject(new Error("Canvas context failed"));
                    }
                };
                img.onerror = (err) => reject(new Error("Image load failed"));
                img.src = e.target?.result as string;
            };
            reader.onerror = (err) => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation - allow up to 10MB since we resize anyway
        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("Файл слишком большой (макс. 10MB)");
            return;
        }

        setIsUploading(true);
        setUploadProgress(1);
        setErrorMessage(null);

        // Prepare Resized Base64 PROMISE immediately
        const base64Promise = resizeImage(file).catch(err => {
            console.error("Resize failed:", err);
            return null; // Return null on failure
        });

        // Create filename: news/timestamp_cleanfilename
        const fileName = `news/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const storageRef = ref(storage, fileName);
        const metadata = { contentType: file.type };
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        // Timeout Safety - Aggressive 2.5s for "Instant" feel
        const safetyTimer = setTimeout(() => {
            if (uploadTask.snapshot.state === 'running') {
                uploadTask.cancel();
                console.warn("Upload timed out, switching to Base64 fallback");
            }
        }, 2500); // 2.5s timeout

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            async (error) => {
                clearTimeout(safetyTimer);
                console.error("Upload Error:", error);

                // Fallback: Await the RESIZED base64 string
                try {
                    const base64String = await base64Promise;
                    if (base64String) {
                        setFormData(prev => ({
                            ...prev,
                            image: prev.image || base64String,
                            images: [...(prev.images || []), base64String]
                        }));
                        setSuccessMessage(`Использована сжатая копия (Тайм-аут загрузки).`);
                    } else {
                        setErrorMessage("Ошибка обработки файла.");
                    }
                } catch (readErr) {
                    setErrorMessage("Не удалось обработать файл.");
                }
                setIsUploading(false);
            },
            async () => {
                clearTimeout(safetyTimer);
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setFormData(prev => ({
                        ...prev,
                        image: prev.image || downloadURL, // Set main image if empty
                        images: [...(prev.images || []), downloadURL]
                    }));
                    setIsUploading(false);
                } catch (err) {
                    console.error("URL Error:", err);
                    // Fallback on URL error too
                    try {
                        const base64String = await base64Promise;
                        if (base64String) {
                            setFormData(prev => ({
                                ...prev,
                                image: prev.image || base64String,
                                images: [...(prev.images || []), base64String]
                            }));
                        }
                    } catch (e) { console.error(e); }
                    setIsUploading(false);
                }
            }
        );
    };

    const removeImage = (index: number) => {
        setFormData(prev => {
            const newImages = prev.images?.filter((_, i) => i !== index) || [];
            return {
                ...prev,
                images: newImages,
                image: newImages.length > 0 ? newImages[0] : ''
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            setErrorMessage("Заполните заголовок и текст");
            return;
        }

        // Reading time calc
        const words = (formData.content || '').split(/\s+/).length;
        const readingTime = Math.ceil(words / 200) || 1;

        // Clean data for Firestore (remove 'id' if present in formData)
        const { id, ...cleanFormData } = formData;

        const dataToSave = {
            ...cleanFormData,
            readingTime,
            updatedAt: serverTimestamp()
        };

        try {
            // Check if we are editing (either a regular news or a VK post)
            if (editingId) {
                const isRawVk = editingId.startsWith('vk_');
                const docId = isRawVk ? null : editingId;

                if (docId) {
                    // Updating an existing Firestore document (regular news or existing override)
                    await updateDoc(doc(db, "news", docId), dataToSave);
                } else {
                    // Creating a NEW Firestore document to override a raw VK post
                    const newDoc = await addDoc(collection(db, "news"), {
                        ...dataToSave,
                        source: 'sparta',
                        createdAt: serverTimestamp(),
                        likes: formData.likes || 0,
                        views: formData.views || 0
                    });
                    setEditingId(newDoc.id); // Switch to the new document's ID
                }

                // --- VK SYNC LOGIC ---
                if (dataToSave.vkId) {
                    try {
                        const syncRes = await fetch('/api/vk-edit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                postId: dataToSave.vkId,
                                ownerId: dataToSave.ownerId,
                                message: dataToSave.content,
                                attachments: dataToSave.vkAttachments
                            })
                        });
                        const syncData = await syncRes.json();
                        if (!syncRes.ok) {
                            console.warn("VK Sync Warning:", syncData.error);
                            setSuccessMessage("Сохранено в Спарте. Ошибка синхронизации с VK (проверьте токен).");
                        } else {
                            setSuccessMessage("Новость обновлена и синхронизирована с VK!");
                        }
                    } catch (err) {
                        console.error("VK Sync API Error:", err);
                        setSuccessMessage("Сохранено в Спарте. VK недоступен.");
                    }
                } else {
                    setSuccessMessage("Новость обновлена успешно!");
                }
            } else {
                // Creating a BRAND NEW regular news item
                const newsRef = await addDoc(collection(db, "news"), {
                    ...dataToSave,
                    createdAt: serverTimestamp(),
                    likes: 0,
                    views: 0
                });
                setSuccessMessage("Новость успешно создана!");
                setEditingId(newsRef.id);
            }

            // Optional: Close editor after success or reset form
            if (formData.status === 'published') {
                // Trigger notifications...
            }

            setTimeout(() => {
                setSuccessMessage(null);
                handleCloseEditor();
                fetchNews(); // Manually refresh after save
            }, 1000);
        } catch (error: any) {
            console.error("Save error:", error);
            setErrorMessage("Ошибка сохранения: " + error.message);
        }
    };

    const handleDelete = async (item: NewsItem) => {
        if (item.id.startsWith('vk_')) {
            alert("Оригинальные посты из ВКонтакте нельзя удалить из этой панели. Они загружаются автоматически.");
            return;
        }

        const confirmMsg = item.vkId
            ? "Удалить отредактированную версию? Пост вернется к оригиналу из ВК."
            : "Удалить новость навсегда?";

        if (window.confirm(confirmMsg)) {
            try {
                await deleteDoc(doc(db, "news", item.id));
                setSuccessMessage("Новость удалена");
                fetchNews(); // Manually refresh after deletion
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err: any) {
                console.error("Delete error:", err);
                setErrorMessage("Ошибка удаления: " + err.message);
            }
        }
    };

    const handleGlobalCleanup = async () => {
        if (!window.confirm("Это действие очистит HTML-теги изо всех новостей. Вы уверены?")) return;

        setIsCleaning(true);
        try {
            const newsSnapshot = await getDocs(collection(db, "news"));
            let updatedCount = 0;

            for (const newsDoc of newsSnapshot.docs) {
                const data = newsDoc.data();
                const cleanContent = stripHtml(data.content || '');
                const cleanTitle = stripHtml(data.title || '');

                // Only update if content actually changed
                if (cleanContent !== data.content || cleanTitle !== data.title) {
                    await updateDoc(doc(db, "news", newsDoc.id), {
                        content: cleanContent,
                        title: cleanTitle
                    });
                    updatedCount++;
                }
            }

            setSuccessMessage(`Очистка завершена! Обновлено записей: ${updatedCount}`);
        } catch (error: any) {
            console.error("Cleanup Error:", error);
            setErrorMessage("Ошибка при очистке: " + error.message);
        } finally {
            setIsCleaning(false);
        }
    };

    // --- Computed ---
    const combinedNews = React.useMemo(() => {
        // Find overrides (Firestore items that represent VK items)
        // Use robust string comparison for vkId
        const overridesIds = news
            .filter(n => n.vkId)
            .map(n => String(n.vkId).trim().toLowerCase());

        // Filter out original VK items that have been overridden
        const filteredVkNews = vkNews.filter(v => {
            const vVkId = String(v.vkId || '').trim().toLowerCase();
            const vIdNum = String(v.id || '').replace('vk_', '').trim().toLowerCase();
            return !overridesIds.includes(vVkId) && !overridesIds.includes(vIdNum);
        });

        const all = [...news, ...filteredVkNews];

        // Sort: Pinned first, then newest, then ID for stability
        return all.sort((a: any, b: any) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            if (timeA !== timeB) return timeB - timeA;

            // Stability fallback
            return String(b.id || '').localeCompare(String(a.id || ''));
        });
    }, [news, vkNews]);

    const filteredNews = combinedNews.filter(item => {
        // Safe access to fields in case of legacy data
        const title = item.title || '';
        const status = item.status || 'published'; // Default properly

        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || status === activeTab;
        return matchesSearch && matchesTab;
    });

    // --- DEBUG INFO (Remove in production) ---
    console.log("Total News:", news.length, "Filtered:", filteredNews.length);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
            <Loader className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                {/* Header */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">Новости Клуба</h1>
                            <p className="text-white/40 text-sm">Управление контентом и публикациями</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => fetchVKNews()}
                                disabled={isSyncingVk}
                                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 py-3 px-4 rounded-xl transition-all flex items-center gap-2 border border-blue-500/20 text-xs font-bold uppercase tracking-wider"
                                title="Синхронизировать посты из группы VK"
                            >
                                <RefreshCw className={isSyncingVk ? "animate-spin" : ""} size={16} />
                                VK Синхро
                            </button>

                            <button
                                onClick={() => setIsTokenModalOpen(true)}
                                className={`py-3 px-4 rounded-xl transition-all flex items-center gap-2 border text-xs font-bold uppercase tracking-wider ${vkToken
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                                    }`}
                                title="Настройка ключа VK API"
                            >
                                <Key size={16} />
                                {vkToken ? 'VK Токен Активен' : 'Ввести Токен VK'}
                            </button>

                            <button
                                onClick={handleGlobalCleanup}
                                disabled={isCleaning}
                                className="bg-white/5 text-white/60 hover:text-white hover:bg-white/10 py-3 px-6 rounded-xl transition-all flex items-center gap-2 border border-white/5 disabled:opacity-50"
                                title="Очистить все новости от HTML-тэгов"
                            >
                                {isCleaning ? <Loader className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                Очистить HTML
                            </button>

                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2 transform active:scale-95"
                            >
                                <Plus size={20} />
                                Создать
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex bg-white/5 p-1 rounded-xl">
                            {(['all', 'published', 'draft'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {tab === 'all' ? 'Все' : (tab === 'published' ? 'Опубликовано' : 'Черновики')}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск новостей..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:border-sparta-gold/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* News List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredNews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/10">
                                <List size={32} />
                            </div>
                            <h3 className="text-white/40 font-bold">Ничего не найдено</h3>
                        </div>
                    ) : (
                        filteredNews.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleOpenEditor(item)}
                                className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-sparta-gold/30 rounded-2xl p-4 flex gap-6 cursor-pointer transition-all duration-300 ${editingId === item.id ? 'border-sparta-gold/50 bg-[#141414] ring-1 ring-sparta-gold/20' : ''}`}
                            >
                                {/* Image Info */}
                                <div className="w-48 h-32 shrink-0 rounded-xl overflow-hidden bg-white/5 relative">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                    {item.isPinned && (
                                        <div className="absolute top-2 left-2 bg-sparta-gold text-black p-1.5 rounded-lg shadow-lg">
                                            <Pin size={12} fill="currentColor" />
                                        </div>
                                    )}
                                </div>

                                {/* Content Info */}
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${CATEGORIES.find(c => c.id === item.category)?.color.replace('bg-', 'text- border-').replace('500', '500/30') || 'text-white/40 border-white/10'
                                                    }`}>
                                                    {CATEGORIES.find(c => c.id === item.category)?.label || 'Новости'}
                                                </span>
                                                {item.vkId && (
                                                    <span className="bg-[#0077FF]/10 text-[#0077FF] border border-[#0077FF]/20 text-[10px] uppercase font-rfont-bold px-2 py-1 rounded flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M15.071 16.59c-6.195 0-9.71-4.288-9.84-11.43h3.297c.074 4.88 2.298 6.94 4.045 7.37V5.16h3.136v4.204c1.72-.188 3.551-2.133 4.14-4.204h3.136c-.451 2.535-2.333 4.417-3.52 5.23 1.187.65 3.323 2.28 4.095 5.201h-3.398c-.588-1.928-2.186-3.41-3.83-3.606v3.606h-.261z" /></svg>
                                                        VK {item.source === 'sparta' ? 'EDIT' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-sparta-gold transition-colors">{item.title}</h3>
                                        <div className="text-white/40 text-sm line-clamp-2 font-normal" dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' }} />
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-2 text-white/30 text-xs">
                                            <Clock size={12} />
                                            {item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'd MMM yyyy', { locale: ru }) : 'Draft'}
                                        </div>
                                        <div className="flex items-center gap-2 text-white/30 text-xs">
                                            <Eye size={12} /> {item.views || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenEditor(item); }}
                                        className="p-2 bg-white/5 hover:bg-sparta-gold hover:text-black text-white/40 rounded-lg transition-all z-30"
                                        title="Редактировать"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    {!item.id.startsWith('vk_') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500/40 hover:text-white rounded-lg transition-all z-30"
                                            title="Удалить"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/5 group-hover:text-sparta-gold/50 group-hover:translate-x-1 transition-all" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Drawer */}
            <div className={`fixed inset-y-0 right-0 w-[500px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white">{editingId ? 'Редактировать' : 'Новая запись'}</h2>
                    <button onClick={handleCloseEditor} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                    {/* Image Upload */}
                    <div className="space-y-3">
                        <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Обложка и галерея</label>
                        <div className="grid grid-cols-3 gap-3">
                            {formData.images?.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group bg-white/5 border border-white/10">
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                    <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-70 hover:opacity-100 group-hover:opacity-100 transition-all cursor-pointer shadow-md" title="Удалить фото">
                                        <X size={12} />
                                    </button>
                                    {idx === 0 && <div className="absolute bottom-0 inset-x-0 bg-sparta-gold/90 text-black text-[9px] font-bold text-center py-0.5">COVER</div>}
                                </div>
                            ))}
                            <label className={`aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-sparta-gold/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader className="animate-spin text-sparta-gold" size={20} />
                                        <span className="text-[10px] text-white/50">{Math.round(uploadProgress)}%</span>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud size={24} className="text-white/20 mb-2" />
                                        <span className="text-[10px] text-white/40">Load</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Video Upload */}
                    <div className="space-y-3">
                        <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Видео (Опционально)</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            {formData.video ? (
                                <div className="relative rounded-lg overflow-hidden bg-black aspect-video group">
                                    {(() => {
                                        const embedUrl = getVideoEmbedUrl(formData.video); // Try to convert raw
                                        const isEmbed = formData.video.includes('youtube.com/embed') || formData.video.includes('vk.com/video_ext.php');

                                        if (isEmbed || embedUrl) {
                                            return (
                                                <iframe
                                                    src={isEmbed ? formData.video : embedUrl}
                                                    className="w-full h-full"
                                                    title="Video Preview"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                    allowFullScreen
                                                />
                                            );
                                        }
                                        return (
                                            <video src={formData.video} className="w-full h-full object-cover" controls />
                                        );
                                    })()}
                                    <button
                                        onClick={() => setFormData({ ...formData, video: '' })}
                                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full opacity-75 hover:opacity-100 group-hover:opacity-100 transition-all transform hover:scale-110 z-10 cursor-pointer shadow-lg"
                                        title="Удалить видео"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className={`w-full h-32 border-2 border-dashed border-white/10 hover:border-sparta-gold/50 hover:bg-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader className="animate-spin text-sparta-gold" size={24} />
                                                <span className="text-xs text-white/50">Загрузка видео... {Math.round(uploadProgress)}%</span>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud size={32} className="text-white/20 mb-2" />
                                                <span className="text-xs text-white/40 font-bold">Выберите видео файл</span>
                                                <span className="text-[10px] text-white/30 mt-1">MP4, WebM (Макс. 200MB)</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                if (file.size > 200 * 1024 * 1024) { // Increased to 200MB
                                                    setErrorMessage("Видео слишком большое (макс. 200MB)");
                                                    return;
                                                }

                                                setIsUploading(true);
                                                setUploadProgress(0);
                                                setErrorMessage(null);

                                                try {
                                                    const fileName = `news/videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                                                    const storageRef = ref(storage, fileName);
                                                    const uploadTask = uploadBytesResumable(storageRef, file);

                                                    // Timeout Safety: If 0% for more than 15s, cancel
                                                    const safetyTimer = setTimeout(() => {
                                                        if (uploadTask.snapshot.bytesTransferred === 0) {
                                                            uploadTask.cancel();
                                                            setIsUploading(false);
                                                            setErrorMessage("Тайм-аут соединения. Проверьте интернет или попробуйте файл поменьше.");
                                                        }
                                                    }, 15000);

                                                    uploadTask.on('state_changed',
                                                        (snapshot) => {
                                                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                                            setUploadProgress(progress);
                                                            if (progress > 0) clearTimeout(safetyTimer);
                                                        },
                                                        (error) => {
                                                            clearTimeout(safetyTimer);
                                                            console.error("Video Upload Error:", error);
                                                            if (error.code !== 'storage/canceled') {
                                                                setErrorMessage("Ошибка загрузки видео: " + error.message);
                                                            }
                                                            setIsUploading(false);
                                                        },
                                                        async () => {
                                                            clearTimeout(safetyTimer);
                                                            try {
                                                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                                                setFormData(prev => ({ ...prev, video: downloadURL, videoType: 'upload' }));
                                                                setIsUploading(false);
                                                                setSuccessMessage("Видео успешно загружено!");
                                                                setTimeout(() => setSuccessMessage(null), 3000);
                                                            } catch (urlError) {
                                                                console.error("URL Error:", urlError);
                                                                setErrorMessage("Ошибка получения ссылки на видео");
                                                                setIsUploading(false);
                                                            }
                                                        }
                                                    );
                                                } catch (err: any) {
                                                    console.error("Video Init Error:", err);
                                                    setErrorMessage("Ошибка инициализации загрузки: " + err.message);
                                                    setIsUploading(false);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-white/5"></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="px-2 bg-[#111] text-white/20">или укажите ссылку</span>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-sparta-gold/50 outline-none"
                                        onBlur={(e) => {
                                            if (e.target.value) {
                                                const rawUrl = e.target.value;
                                                const embedUrl = getVideoEmbedUrl(rawUrl);

                                                if (embedUrl) {
                                                    setFormData({ ...formData, video: embedUrl, videoType: 'embed' });
                                                } else {
                                                    setFormData({ ...formData, video: rawUrl, videoType: 'upload' });
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Заголовок</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-sparta-gold/50 outline-none transition-all"
                            placeholder="Введите заголовок..."
                        />
                    </div>

                    {/* Category & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Категория</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:border-sparta-gold/50 outline-none appearance-none"
                            >
                                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="bg-[#111]">{cat.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Статус</label>
                            <div className="flex bg-white/5 rounded-xl p-1">
                                <button
                                    onClick={() => setFormData({ ...formData, status: 'published' })}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-white/30'}`}
                                >Pub</button>
                                <button
                                    onClick={() => setFormData({ ...formData, status: 'draft' })}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' : 'text-white/30'}`}
                                >Draft</button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Содержание</label>
                        <RichTextEditor
                            value={formData.content || ''}
                            onChange={val => setFormData({ ...formData, content: val })}
                            placeholder="Напишите что-нибудь интересное..."
                        />
                    </div>

                    {/* Poll Section */}
                    <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5 transition-all">
                        <div className="flex items-center justify-between">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <LayoutGrid size={14} /> Опрос
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/30">{formData.poll ? 'Включен' : 'Выключен'}</span>
                                <input
                                    type="checkbox"
                                    checked={!!formData.poll}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setFormData({
                                                ...formData,
                                                poll: { question: '', options: ['', ''] }
                                            });
                                        } else {
                                            setFormData({ ...formData, poll: null });
                                        }
                                    }}
                                    className="accent-sparta-gold w-4 h-4"
                                />
                            </div>
                        </div>

                        {formData.poll && (
                            <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-white/50 text-[10px] font-bold uppercase">Вопрос</label>
                                    <input
                                        type="text"
                                        value={formData.poll.question}
                                        onChange={e => setFormData({
                                            ...formData,
                                            poll: { ...formData.poll!, question: e.target.value }
                                        })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sparta-gold/50 outline-none"
                                        placeholder="Например: Кто победит в турнире?"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white/50 text-[10px] font-bold uppercase">Варианты ответов</label>
                                    <div className="space-y-2">
                                        {formData.poll.options.map((option, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={e => {
                                                        const newOptions = [...formData.poll!.options];
                                                        newOptions[idx] = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            poll: { ...formData.poll!, options: newOptions }
                                                        });
                                                    }}
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sparta-gold/50 outline-none"
                                                    placeholder={`Вариант ${idx + 1}`}
                                                />
                                                {formData.poll!.options.length > 2 && (
                                                    <button
                                                        onClick={() => {
                                                            const newOptions = formData.poll!.options.filter((_, i) => i !== idx);
                                                            setFormData({
                                                                ...formData,
                                                                poll: { ...formData.poll!, options: newOptions }
                                                            });
                                                        }}
                                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {formData.poll.options.length < 6 && (
                                        <button
                                            onClick={() => setFormData({
                                                ...formData,
                                                poll: { ...formData.poll!, options: [...formData.poll!.options, ''] }
                                            })}
                                            className="text-xs text-sparta-gold font-bold hover:underline flex items-center gap-1 mt-2"
                                        >
                                            <Plus size={12} /> Добавить вариант
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${formData.isPinned ? 'bg-sparta-gold text-black' : 'bg-white/10 text-white/30'}`}>
                                <Pin size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Закрепить новость</div>
                                <div className="text-xs text-white/40">Будет отображаться первой</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.isPinned}
                            onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                            className="accent-sparta-gold w-5 h-5"
                        />
                    </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-6 border-t border-white/10 bg-[#111]">
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle size={18} />
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 text-sm">
                            <CheckCircle size={18} />
                            {successMessage}
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="w-full bg-sparta-gold text-black font-bold py-4 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader className="animate-spin" /> : <Save size={20} />}
                        <span>Сохранить изменения</span>
                    </button>
                </div>
            </div>

            {/* VK Token Modal */}
            {isTokenModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-russo text-white">Ключ VK API</h3>
                                    <p className="text-xs text-white/40">Синхронизация постов со стены sparta_fk</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTokenModalOpen(false)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider block">
                                Service Token / Access Token VK
                            </label>
                            <input
                                type="password"
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                placeholder="vk1.a.xxxxxxxxxxxxxxxx..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none font-mono"
                            />
                            <p className="text-[11px] text-white/30 leading-relaxed">
                                Ключ доступа сообщества или сервисный ключ из настроек приложения ВКонтакте (dev.vk.com).
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsTokenModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-medium transition-all"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSaveVkToken}
                                className="px-6 py-2.5 rounded-xl bg-sparta-gold text-black text-sm font-bold hover:bg-[#ffd700] transition-all flex items-center gap-2"
                            >
                                <Save size={16} />
                                Сохранить ключ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNews;
