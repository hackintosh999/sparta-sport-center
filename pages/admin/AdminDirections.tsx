import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import {
    Plus, Trash2, Image as ImageIcon, Loader, Edit2, X, Save, UploadCloud, Check, RefreshCw, DollarSign, List, Flame, Trophy, ShieldCheck, Sparkles, CheckCircle2
} from 'lucide-react';

interface Program {
    id: string;
    title: string;
    prices: {
        1?: number;
        3: number;
        6: number;
        12: number;
    };
    image: string;
    features: string[];
    order?: number;
    isPromoActive?: boolean;
    discountPercent?: number;
    promoBadgeText?: string;
    promoTargetMonths?: number[];
    sessionsPerWeek?: number;
    customPerSessionPrice?: Record<string, number>;
    createdAt?: any;
}

export const getProgramImage = (program: any) => {
    if (!program) return '/sparta_clean_beginner_tariff.jpg';
    const img = (program.image || '').trim();
    const titleLower = (program.title || '').toLowerCase();

    const isOldLegacyImage = !img || 
        img === '/sparta_beginner_tariff.jpg' || 
        img === '/sparta_pro_tariff.jpg' || 
        img === '/sparta_champion_tariff.jpg' ||
        img === '/sparta_logo_beginner_tariff.jpg' ||
        img === '/sparta_logo_pro_tariff.jpg' ||
        img === '/sparta_logo_champion_tariff.jpg' ||
        img === '/junior-tariff.png' ||
        img === '/pro-tariff.png' ||
        img === '/champion-tariff.png' ||
        img.includes('sparta_beginner_tariff') ||
        img.includes('sparta_pro_tariff') ||
        img.includes('sparta_champion_tariff') ||
        img.includes('sparta_logo_') ||
        img.includes('tariff.png');

    if (isOldLegacyImage) {
        if (titleLower.includes('новичок')) return '/sparta_clean_beginner_tariff.jpg';
        if (titleLower.includes('профессионал')) return '/sparta_clean_pro_tariff.jpg';
        if (titleLower.includes('чемпион')) return '/sparta_clean_champion_tariff.jpg';
        return '/sparta_clean_beginner_tariff.jpg';
    }
    return img;
};

const DEFAULT_PROGRAMS = [
    {
        title: "Новичок",
        prices: { 1: 5200, 3: 11990, 6: 19990, 12: 36480 },
        image: "/sparta_clean_beginner_tariff.jpg",
        features: ["8 тренировок в месяц (2 раза в неделю)", "Базовая подготовка", "Групповые занятия", "Безопасная среда"],
        sessionsPerWeek: 2
    },
    {
        title: "Профессионал",
        prices: { 1: 7790, 3: 17990, 6: 29990, 12: 54720 },
        image: "/sparta_clean_pro_tariff.jpg",
        features: ["12 тренировок в месяц (3 раза в неделю)", "Интенсивная подготовка", "Отработка тактики", "Спортивный анализ"],
        sessionsPerWeek: 3
    },
    {
        title: "Чемпион",
        prices: { 1: 9900, 3: 23990, 6: 39990, 12: 72960 },
        image: "/sparta_clean_champion_tariff.jpg",
        features: ["16 тренировок в месяц (4 раза в неделю)", "Игровая практика", "Путь в сборную", "Полный комплект экипировки"],
        sessionsPerWeek: 4
    }
];

const PRESET_IMAGES = [
    { label: 'Новичок (Мяч)', url: '/sparta_clean_beginner_tariff.jpg' },
    { label: 'Профи (Бутсы)', url: '/sparta_clean_pro_tariff.jpg' },
    { label: 'Чемпион (Кубок)', url: '/sparta_clean_champion_tariff.jpg' }
];

const AdminDirections = () => {
    // --- State ---
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [previewDuration, setPreviewDuration] = useState<1 | 3 | 6 | 12>(6);

    // Editor State
    const [formData, setFormData] = useState<Partial<Program>>({
        title: '',
        image: '',
        prices: { 1: 0, 3: 0, 6: 0, 12: 0 },
        features: [],
        order: 0,
        isPromoActive: false,
        discountPercent: 0,
        promoBadgeText: '',
        promoTargetMonths: [6, 12],
        sessionsPerWeek: 3
    });
    const [featureInput, setFeatureInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, "directions"), orderBy("order", "asc")), async (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            setPrograms(data);
            setLoading(false);

            // Auto-migrate legacy images if any found
            const legacyDocs = snapshot.docs.filter((docSnap: any) => {
                const docData = docSnap.data();
                const cleanImg = getProgramImage(docData);
                return docData.image !== cleanImg && (
                    !docData.image || 
                    docData.image.includes('sparta_beginner_tariff') || 
                    docData.image.includes('sparta_pro_tariff') || 
                    docData.image.includes('sparta_champion_tariff') ||
                    docData.image.includes('sparta_logo_') ||
                    docData.image.includes('tariff.png')
                );
            });

            if (legacyDocs.length > 0) {
                try {
                    const batch = writeBatch(db);
                    legacyDocs.forEach(d => {
                        const cleanImg = getProgramImage(d.data());
                        batch.update(d.ref, { image: cleanImg });
                    });
                    await batch.commit();
                } catch (e) {
                    console.warn("Could not auto-migrate legacy direction images:", e);
                }
            }
        }, (error) => {
            console.error("Firestore Read Error:", error);
            setErrorMessage(`Ошибка доступа к БД: ${error.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Helpers ---

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
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    } else {
                        reject(new Error("Canvas failed"));
                    }
                };
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
        });
    };

    const handleAutoSync = async () => {
        if (programs.length > 0) {
            if (!window.confirm("Это перезапишет список направлений эталонными тарифами и актуальными изображениями Sparta?")) return;
        }

        setSyncing(true);
        try {
            const batch = writeBatch(db);
            const oldDocs = await getDocs(collection(db, "directions"));
            oldDocs.forEach(d => {
                batch.delete(d.ref);
            });

            DEFAULT_PROGRAMS.forEach((prog, index) => {
                const docRef = doc(collection(db, "directions"));
                batch.set(docRef, {
                    ...prog,
                    order: index + 1,
                    isPromoActive: false,
                    discountPercent: 0,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            setSuccessMessage("Тарифы и изображения успешно обновлены!");
        } catch (error: any) {
            setErrorMessage("Ошибка: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleUpdateImagesOnly = async () => {
        setSyncing(true);
        try {
            const batch = writeBatch(db);
            programs.forEach(prog => {
                const cleanImg = getProgramImage(prog);
                const docRef = doc(db, "directions", prog.id);
                batch.update(docRef, { image: cleanImg });
            });
            await batch.commit();
            setSuccessMessage("Изображения всех направлений обновлены на актуальные!");
        } catch (error: any) {
            setErrorMessage("Ошибка обновления: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    // --- Handlers ---

    const handleOpenEditor = (item?: Program) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                title: item.title || '',
                image: getProgramImage(item),
                prices: { 1: 0, 3: 0, 6: 0, 12: 0, ...(item.prices || {}) },
                features: item.features || [],
                order: item.order || 0,
                isPromoActive: item.isPromoActive ?? false,
                discountPercent: item.discountPercent ?? 20,
                promoBadgeText: item.promoBadgeText || '🔥 АКЦИЯ',
                promoTargetMonths: item.promoTargetMonths || [6, 12],
                sessionsPerWeek: item.sessionsPerWeek || 3
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                image: '/sparta_clean_beginner_tariff.jpg',
                prices: { 1: 0, 3: 0, 6: 0, 12: 0 },
                features: [],
                order: programs.length + 1,
                isPromoActive: false,
                discountPercent: 20,
                promoBadgeText: '🔥 АКЦИЯ',
                promoTargetMonths: [6, 12],
                sessionsPerWeek: 3
            });
        }
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsEditorOpen(true);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingId(null);
        setFeatureInput('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const base64 = await resizeImage(file);
            setFormData(prev => ({ ...prev, image: base64 }));
            setSuccessMessage("Фото готово");
        } catch (e: any) {
            setErrorMessage("Ошибка фото: " + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const addFeature = () => {
        if (!featureInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            features: [...(prev.features || []), featureInput.trim()]
        }));
        setFeatureInput('');
    };

    const removeFeature = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features?.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            setErrorMessage("Заполните название");
            return;
        }

        const dataToSave = {
            ...formData,
            image: formData.image || getProgramImage(formData),
            isPromoActive: !!formData.isPromoActive,
            discountPercent: formData.discountPercent || 0,
            promoBadgeText: formData.promoBadgeText || '',
            promoTargetMonths: formData.promoTargetMonths || [6, 12],
            sessionsPerWeek: formData.sessionsPerWeek || 3,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "directions", editingId), dataToSave);
                setSuccessMessage("Обновлено!");
            } else {
                await addDoc(collection(db, "directions"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Добавлено!");
            }
            setTimeout(() => {
                setSuccessMessage(null);
                handleCloseEditor();
            }, 500);
        } catch (error: any) {
            setErrorMessage("Ошибка: " + error.message);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Удалить направление?")) {
            await deleteDoc(doc(db, "directions", id));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full bg-[#050505]">
            <Loader className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[420px]' : ''}`}>
                {/* Header */}
                <div className="p-6 md:p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-russo text-white tracking-wide">Направления & Тарифы</h1>
                                <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                    1-в-1 превью
                                </span>
                            </div>
                            <p className="text-white/50 text-xs mt-1">Точный предпросмотр карточек с сайта и управление ценами</p>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <button
                                onClick={handleUpdateImagesOnly}
                                disabled={syncing}
                                title="Обновить картинки карточек на актуальные без сброса цен"
                                className="bg-white/5 text-white/80 border border-white/10 font-bold py-2 px-3.5 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                            >
                                <Sparkles size={14} className="text-amber-400" />
                                Обновить картинки
                            </button>

                            <button
                                onClick={handleAutoSync}
                                disabled={syncing}
                                className="bg-white/10 text-white font-bold py-2 px-4 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                            >
                                {syncing ? <Loader className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                {programs.length === 0 ? "Загрузить стандартные" : "Сбросить тарифы"}
                            </button>

                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold py-2 px-4 rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5 text-xs transform active:scale-95 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            >
                                <Plus size={16} />
                                Добавить
                            </button>
                        </div>
                    </div>

                    {/* Preview Duration Switcher */}
                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
                        <span className="text-white/40 text-xs font-bold px-3 uppercase tracking-wider">Предпросмотр периода:</span>
                        {[1, 3, 6, 12].map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setPreviewDuration(m as 1 | 3 | 6 | 12)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${previewDuration === m ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black' : 'text-white/50 hover:text-white'}`}
                            >
                                {m} {m === 1 ? 'месяц' : m <= 4 ? 'месяца' : 'месяцев'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List - Exact 1-to-1 Live Cards */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 overflow-x-hidden custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-7xl mx-auto">
                        {programs.map(prog => {
                            const isEditingThis = editingId === prog.id;
                            const liveProg = isEditingThis ? { ...prog, ...formData } : prog;
                            const titleLower = (liveProg.title || '').toLowerCase();
                            
                            const isFeatured = titleLower.includes('профессионал');
                            const isVip = titleLower.includes('чемпион');
                            const isBeginner = titleLower.includes('новичок');

                            const frequencySubtitle = isBeginner
                                ? '2 тренировки в неделю • Легкий старт'
                                : isFeatured
                                ? '3 тренировки в неделю • Игра & Прогресс'
                                : '4 тренировки в неделю • Сборная & Турниры';

                            const numericPrice = (liveProg.prices as any)?.[previewDuration] || 0;
                            const weeklySessions = liveProg.sessionsPerWeek || (isBeginner ? 2 : isFeatured ? 3 : 4);
                            const workoutsPerMonth = weeklySessions * 4;
                            const totalWorkouts = previewDuration * 4 * weeklySessions;

                            const base1MonthPrice = (liveProg.prices as any)?.[1] || (
                                isBeginner ? 5200 : isFeatured ? 7790 : 9990
                            );

                            let price = numericPrice;
                            if (!price || price === 0) {
                                if (previewDuration === 1) price = base1MonthPrice;
                                else if (previewDuration === 3) price = workoutsPerMonth * 3 * 500;
                                else if (previewDuration === 6) price = workoutsPerMonth * 6 * 420;
                                else if (previewDuration === 12) price = workoutsPerMonth * 12 * 380;
                                else price = base1MonthPrice * previewDuration;
                            }

                            const calculatedOriginalTotal = previewDuration > 1 ? base1MonthPrice * previewDuration : null;
                            let originalTotal: number | null = calculatedOriginalTotal;

                            if (liveProg.isPromoActive && liveProg.discountPercent) {
                                const targetMonths = liveProg.promoTargetMonths || [6, 12];
                                if (targetMonths.includes(previewDuration)) {
                                    if (!originalTotal) originalTotal = price;
                                    price = Math.floor(price * (1 - liveProg.discountPercent / 100));
                                }
                            }

                            const perSession = price && totalWorkouts ? Math.round(price / totalWorkouts) : 0;
                            const savingsAmount = originalTotal && originalTotal > price ? (originalTotal - price) : 0;

                            let badgeText = '';
                            if (previewDuration === 6) badgeText = 'от 420 ₽ за занятие';
                            else if (previewDuration === 3) badgeText = 'от 500 ₽ за занятие';
                            else if (previewDuration === 12) badgeText = 'от 380 ₽ за занятие';
                            else badgeText = `≈ ${perSession} ₽ / занятие`;

                            const cardImage = getProgramImage(liveProg);

                            return (
                                <div
                                    key={prog.id}
                                    onClick={() => handleOpenEditor(prog)}
                                    className="relative group flex cursor-pointer"
                                >
                                    {/* Multi-layer Glowing Frame Container */}
                                    <div className={`w-full flex flex-col rounded-[28px] p-[1.5px] transition-all duration-500 relative ${
                                        isEditingThis
                                            ? 'ring-2 ring-amber-400 shadow-[0_0_35px_rgba(212,175,55,0.4)] bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 scale-[1.02] z-10'
                                            : isFeatured
                                            ? 'bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 shadow-[0_0_45px_rgba(245,158,11,0.35)] scale-[1.02] z-10'
                                            : isVip
                                            ? 'bg-gradient-to-b from-amber-500/50 via-amber-700/30 to-zinc-800/80 shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_35px_rgba(212,175,55,0.3)]'
                                            : 'bg-gradient-to-b from-white/20 via-white/5 to-transparent hover:from-amber-400/40 hover:to-amber-500/20'
                                    }`}>
                                        {/* Card Inner Body with Glassmorphism */}
                                        <div className={`h-full flex flex-col w-full rounded-[26px] overflow-hidden relative backdrop-blur-2xl transition-colors duration-300 ${
                                            isFeatured
                                                ? 'bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black'
                                                : 'bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-black'
                                        }`}>
                                            {/* Card Header & Image with Gradient Blend Overlay */}
                                            <div className="relative h-48 sm:h-52 overflow-hidden rounded-t-[26px] bg-zinc-950">
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-transparent z-10 pointer-events-none" />
                                                <img
                                                    src={cardImage}
                                                    alt={liveProg.title}
                                                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                                                />
                                                {/* Gradient Mask to smoothly transition image to card body */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10 pointer-events-none" />

                                                {/* Top-Right Badges */}
                                                <div className="absolute top-4 right-4 z-20">
                                                    {isFeatured ? (
                                                        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.8)] border border-amber-300/80 flex items-center gap-1.5 animate-pulse">
                                                            <Flame size={13} className="fill-black" /> ХИТ ПРОДАЖ
                                                        </div>
                                                    ) : isVip ? (
                                                        <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-500/60 text-amber-400 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-1.5">
                                                            <Trophy size={13} /> МАКС. РЕЗУЛЬТАТ
                                                        </div>
                                                    ) : (
                                                        <div className="bg-zinc-950/70 backdrop-blur-md border border-white/20 text-zinc-300 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                                                            БАЗОВЫЙ
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Delete Quick Button on Card */}
                                                <button
                                                    onClick={(e) => handleDelete(prog.id, e)}
                                                    title="Удалить направление"
                                                    className="absolute top-4 left-4 p-2.5 bg-black/70 hover:bg-red-500 rounded-full text-white/70 hover:text-white transition-all z-20 opacity-0 group-hover:opacity-100 shadow-lg"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            {/* Card Main Content */}
                                            <div className="p-6 md:p-7 flex-1 flex flex-col justify-between -mt-4 z-20 relative">
                                                <div>
                                                    {/* Header Title & Subtitle */}
                                                    <div className="mb-5">
                                                        <h3 className="font-russo text-2xl sm:text-3xl text-white group-hover:text-amber-400 transition-colors tracking-wide">
                                                            {liveProg.title}
                                                        </h3>
                                                        <p className="text-xs font-manrope font-bold text-amber-400/90 mt-1 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                                                            {frequencySubtitle}
                                                        </p>
                                                    </div>

                                                    {/* Premium Price Box */}
                                                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md mb-6 relative overflow-hidden group-hover:border-amber-400/30 transition-colors">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                                                        
                                                        <div className="flex items-baseline gap-2 flex-wrap">
                                                            <span className="font-manrope text-3xl sm:text-4xl font-black text-amber-400 tracking-tight tabular-nums drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                                                                {price.toLocaleString('ru-RU')} ₽
                                                            </span>
                                                            {originalTotal && savingsAmount > 0 && (
                                                                <span className="line-through text-zinc-500 text-sm font-semibold tabular-nums">
                                                                    {originalTotal.toLocaleString('ru-RU')} ₽
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                            {badgeText && (
                                                                <span className="bg-amber-400/15 border border-amber-400/30 text-amber-300 font-manrope font-bold text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                                    ⚡ {badgeText}
                                                                </span>
                                                            )}
                                                            {savingsAmount > 0 && (
                                                                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
                                                                    Экономия {savingsAmount.toLocaleString('ru-RU')} ₽
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Features Bullet List */}
                                                    <ul className="space-y-3 mb-6">
                                                        {liveProg.features?.map((feat, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-zinc-200 font-manrope text-xs sm:text-sm leading-relaxed">
                                                                <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/40 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                                                                    <Check size={10} className="text-amber-400" />
                                                                </div>
                                                                <span>{feat}</span>
                                                            </li>
                                                        ))}
                                                        {/* Guarantee Bullet */}
                                                        <li className="flex items-center gap-2.5 text-emerald-400 font-manrope text-xs font-bold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                                            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                                            <span>100% заморозка при болезни (занятия не сгорают)</span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                {/* Action Button & Trust Microtext */}
                                                <div className="pt-4 border-t border-white/10">
                                                    <div className="space-y-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditor(prog);
                                                            }}
                                                            className={`w-full group py-3.5 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                                                                isFeatured
                                                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.5)] border-none cursor-pointer'
                                                                    : 'border border-white/20 bg-white/5 hover:border-amber-400 hover:bg-amber-400 hover:text-black text-white cursor-pointer'
                                                            }`}
                                                        >
                                                            <Edit2 size={16} />
                                                            <span>Редактировать</span>
                                                        </button>
                                                        <p className="text-[10px] text-center font-manrope text-zinc-400">
                                                            🔒 100% Заморозка при болезни • Абонементы возврату не подлежат
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Editor Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-[420px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <div>
                        <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать тариф' : 'Новое направление'}</h2>
                        <p className="text-white/40 text-xs mt-0.5">Изменения сразу отразятся на карточках</p>
                    </div>
                    <button onClick={handleCloseEditor} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Image Preview and Selector */}
                    <div className="space-y-3">
                        <label className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>Обложка тарифа</span>
                            <span className="text-[10px] text-amber-400 lowercase">рекомендуется 16:9</span>
                        </label>

                        <div className="aspect-video w-full rounded-2xl bg-zinc-900 relative overflow-hidden group border border-white/10 shadow-lg">
                            <img
                                src={getProgramImage(formData)}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <Loader className="animate-spin text-amber-400" />
                                </div>
                            )}
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs">
                                <span className="bg-amber-400 text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xl">
                                    <UploadCloud size={16} /> Загрузить файл
                                </span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div>
                            <span className="text-[10px] text-white/40 uppercase font-bold block mb-1.5">Быстрый выбор эталонных картинок:</span>
                            <div className="grid grid-cols-3 gap-1.5">
                                {PRESET_IMAGES.map(p => (
                                    <button
                                        key={p.url}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, image: p.url })}
                                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all truncate text-center cursor-pointer ${
                                            getProgramImage(formData) === p.url
                                                ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/60 text-xs font-bold uppercase tracking-wider">Название направления</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-400/50 outline-none transition-all text-sm font-semibold"
                                placeholder="Например: Чемпион"
                            />
                        </div>

                        {/* Promo Settings */}
                        <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <label className="text-white/90 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Flame size={15} className="text-amber-400" /> Управление акцией
                                </label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.isPromoActive}
                                        onChange={e => setFormData({ ...formData, isPromoActive: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                                </label>
                            </div>

                            {formData.isPromoActive && (
                                <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-white/40 mb-1 block uppercase font-bold">Скидка (%)</label>
                                            <input
                                                type="number"
                                                value={formData.discountPercent ?? ''}
                                                onChange={e => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/90 text-sm focus:border-amber-400/50 outline-none"
                                                placeholder="20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 mb-1 block uppercase font-bold">Текст плашки</label>
                                            <input
                                                type="text"
                                                value={formData.promoBadgeText ?? ''}
                                                onChange={e => setFormData({ ...formData, promoBadgeText: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/90 text-sm focus:border-amber-400/50 outline-none"
                                                placeholder="🔥 АКЦИЯ"
                                            />
                                        </div>
                                    </div>

                                    {/* Duration Selector Chips */}
                                    <div>
                                        <label className="text-[10px] text-white/40 mb-1.5 block uppercase font-bold">Применить акцию к периодам:</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[1, 3, 6, 12].map(m => {
                                                const targetMonths = formData.promoTargetMonths || [6, 12];
                                                const isSelected = targetMonths.includes(m);
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => {
                                                            const next = isSelected
                                                                ? targetMonths.filter(x => x !== m)
                                                                : [...targetMonths, m];
                                                            setFormData({ ...formData, promoTargetMonths: next });
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                                    >
                                                        {m} мес
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prices */}
                        <div className="space-y-2">
                            <label className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={14} className="text-amber-400" /> Цены по периодам (₽)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 3, 6, 12].map(m => (
                                    <div key={m}>
                                        <div className="text-[10px] text-white/40 mb-1 ml-1 font-semibold">{m} Мес</div>
                                        <input
                                            type="number"
                                            value={(formData.prices as any)?.[m] || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                prices: { ...formData.prices, [m]: parseInt(e.target.value) || 0 } as any
                                            })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-white/90 text-sm focus:border-amber-400/50 outline-none font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-2">
                            <label className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <List size={14} className="text-amber-400" /> Особенности направления
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={featureInput}
                                    onChange={e => setFeatureInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addFeature()}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400/50 outline-none"
                                    placeholder="Например: 8 занятий в месяц"
                                />
                                <button
                                    type="button"
                                    onClick={addFeature}
                                    className="bg-amber-400 text-black font-bold px-3 py-2 rounded-xl hover:brightness-110 transition-all flex items-center justify-center"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {formData.features?.map((feat, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 px-3.5 py-2 rounded-xl border border-white/5 group hover:border-white/10">
                                        <span className="text-xs text-white/80">{feat}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFeature(idx)}
                                            className="text-white/30 hover:text-red-400 transition-colors p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sessions & Order */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-white/60 text-xs font-bold uppercase tracking-wider">Тренировок в нед</label>
                                <input
                                    type="number"
                                    value={formData.sessionsPerWeek || ''}
                                    onChange={e => setFormData({ ...formData, sessionsPerWeek: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-400/50 outline-none text-sm"
                                    placeholder="2, 3 или 4"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-white/60 text-xs font-bold uppercase tracking-wider">Порядок</label>
                                <input
                                    type="number"
                                    value={formData.order}
                                    onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-400/50 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} /> {successMessage}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold py-3 px-6 rounded-xl hover:brightness-110 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer shadow-lg"
                    >
                        <Save size={18} />
                        Сохранить направление
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDirections;