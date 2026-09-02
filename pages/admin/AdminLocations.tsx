import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Save, X, Navigation, Image as ImageIcon, Check, Building2, Car, Phone, Eye, EyeOff, Compass, Sparkles, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Upload, Layers, Star, ArrowUp, ArrowDown, Camera, Settings, Smartphone, Tablet, Monitor } from 'lucide-react';
import { LocationItem, City, GalleryItem } from '../../types/city';
import { SPARTA_LOCATIONS, CITIES } from '../../constants/cities';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import RouteModal from '../../components/RouteModal';
import { uploadToSupabaseStorage } from '../../utils/supabaseStorage';
import { useAuth } from '../../context/AuthContext';

export const AdminLocations: React.FC = () => {
    const { userProfile } = useAuth();
    const canManageCities = Boolean(
        userProfile?.role && ['director', 'developer', 'dev', 'super'].includes(userProfile.role)
    );

    const [locations, setLocations] = useState<LocationItem[]>(SPARTA_LOCATIONS);
    const [cities, setCities] = useState<City[]>(CITIES);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoc, setEditingLoc] = useState<Partial<LocationItem> | null>(null);
    const [selectedCityId, setSelectedCityId] = useState<string>('all');
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePreviewPhotoIdx, setActivePreviewPhotoIdx] = useState(0);
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
    const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    // Detect Touch/Mobile device to adapt instructions dynamically
    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768
            );
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    // Testing RouteModal preview
    const [isPreviewRouteOpen, setIsPreviewRouteOpen] = useState(false);
    const [previewLocationId, setPreviewLocationId] = useState<string>('newton');

    // Fetch dynamic locations from Firestore and merge with defaults
    useEffect(() => {
        const q = query(collection(db, 'locations'));
        const unsub = onSnapshot(q, (snapshot) => {
            const firestoreLocs = !snapshot.empty 
                ? snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LocationItem[]
                : [];
            
            // Deep merge static SPARTA_LOCATIONS with Firestore updates by ID
            const merged = SPARTA_LOCATIONS.map(staticLoc => {
                const dbMatch = firestoreLocs.find(d => d.id === staticLoc.id);
                return dbMatch ? { ...staticLoc, ...dbMatch } : staticLoc;
            });

            // Include any brand-new custom locations created in Firestore
            const customNewLocs = firestoreLocs.filter(d => !SPARTA_LOCATIONS.some(s => s.id === d.id));
            
            setLocations([...merged, ...customNewLocs]);
        }, (err) => {
            console.log("Firestore locations fallback", err);
            setLocations(SPARTA_LOCATIONS);
        });
        return () => unsub();
    }, []);

    // Fetch dynamic cities
    useEffect(() => {
        const q = query(collection(db, 'cities'), orderBy('sortOrder', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const dynamicCities = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as City[];
                setCities(dynamicCities);
            }
        });
        return () => unsub();
    }, []);

    // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
    useEffect(() => {
        if (!isModalOpen || !editingLoc) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const filesToUpload: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) filesToUpload.push(file);
                }
            }

            if (filesToUpload.length > 0) {
                e.preventDefault();
                await processMultipleFilesUpload(filesToUpload);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isModalOpen, editingLoc]);

    // Helper to safely normalize gallery items from any legacy format
    const normalizeGalleryItems = (loc?: LocationItem | Partial<LocationItem>): GalleryItem[] => {
        if (!loc) return [];
        const items: GalleryItem[] = [];

        if (Array.isArray(loc.galleryItems) && loc.galleryItems.length > 0) {
            loc.galleryItems.forEach((g: any, idx: number) => {
                if (typeof g === 'string' && g.trim()) {
                    items.push({ url: g, title: `Зона ${idx + 1}` });
                } else if (g && typeof g === 'object' && g.url) {
                    items.push({ url: g.url, title: g.title || `Зона ${idx + 1}` });
                }
            });
        }

        if (items.length === 0) {
            if (loc.imageUrl) {
                items.push({ url: loc.imageUrl, title: 'Главный вход / Фасад' });
            }
            if (Array.isArray(loc.gallery)) {
                loc.gallery.forEach((g: any, idx: number) => {
                    if (typeof g === 'string' && g && g !== loc.imageUrl) {
                        items.push({ url: g, title: `Зона ${idx + 1}` });
                    }
                });
            }
        }

        return items;
    };

    const handleOpenModal = (loc?: LocationItem) => {
        setShowAdvanced(false);
        setActivePreviewPhotoIdx(0);
        setActiveModalTab('form');
        if (loc) {
            setEditingLoc({
                ...loc,
                galleryItems: normalizeGalleryItems(loc)
            });
        } else {
            setEditingLoc({
                id: `loc_${Date.now()}`,
                cityId: 'chelyabinsk',
                city: 'Челябинск',
                name: '',
                shortName: '',
                address: '',
                details: 'Главный вход, 1 этаж',
                parking: 'Бесплатная парковка у входа',
                lat: 55.168134,
                lon: 61.284612,
                phone: '+7 (351) 230-12-69',
                badge: 'Зал SPARTA',
                status: 'active',
                imageUrl: '',
                galleryItems: []
            });
        }
        setIsModalOpen(true);
    };

    // Batch Multi-File Upload Handler
    const processMultipleFilesUpload = async (files: FileList | File[], replaceIndex?: number) => {
        if (!files || files.length === 0) return;
        setUploading(true);

        try {
            const fileArray = Array.from(files);
            const uploadedItems: GalleryItem[] = [];

            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];
                const url = await uploadToSupabaseStorage(file, 'locations');
                if (url) {
                    const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                    const title = rawName.length > 2 && rawName.length < 30
                        ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
                        : `Зона ${(editingLoc?.galleryItems?.length || 0) + i + 1}`;

                    uploadedItems.push({ url, title });
                }
            }

            setEditingLoc(prev => {
                const currentItems = [...(prev?.galleryItems || [])];

                if (replaceIndex !== undefined && uploadedItems.length > 0) {
                    currentItems[replaceIndex] = {
                        ...currentItems[replaceIndex],
                        url: uploadedItems[0].url
                    };
                } else {
                    currentItems.push(...uploadedItems);
                }

                return {
                    ...prev,
                    imageUrl: currentItems[0]?.url || '',
                    galleryItems: currentItems
                };
            });
        } catch (err: any) {
            console.error("Batch upload error:", err);
            alert("Ошибка загрузки файлов.");
        } finally {
            setUploading(false);
        }
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
        if (e.target.files && e.target.files.length > 0) {
            await processMultipleFilesUpload(e.target.files, replaceIndex);
            e.target.value = '';
        }
    };

    // Drag & Drop Handlers for Multiple Files
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent, replaceIndex?: number) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processMultipleFilesUpload(e.dataTransfer.files, replaceIndex);
        }
    };

    const addEmptyGallerySlot = () => {
        setEditingLoc(prev => ({
            ...prev,
            galleryItems: [
                ...(prev?.galleryItems || []),
                { url: '', title: `Новая зона ${((prev?.galleryItems?.length || 0) + 1)}` }
            ]
        }));
    };

    const removeGalleryItem = (index: number) => {
        setEditingLoc(prev => {
            const updated = (prev?.galleryItems || []).filter((_, idx) => idx !== index);
            return {
                ...prev,
                imageUrl: updated[0]?.url || '',
                galleryItems: updated
            };
        });
    };

    const makePrimaryPhoto = (index: number) => {
        setEditingLoc(prev => {
            const items = [...(prev?.galleryItems || [])];
            if (index > 0 && items[index]) {
                const [target] = items.splice(index, 1);
                items.unshift(target);
            }
            return {
                ...prev,
                imageUrl: items[0]?.url || '',
                galleryItems: items
            };
        });
        setActivePreviewPhotoIdx(0);
    };

    const updateGalleryTitle = (index: number, title: string) => {
        setEditingLoc(prev => {
            const items = [...(prev?.galleryItems || [])];
            if (items[index]) {
                items[index] = { ...items[index], title };
            }
            return { ...prev, galleryItems: items };
        });
    };

    // Auto-geocode coordinates estimate helper
    const autoEstimateGPS = () => {
        if (!editingLoc) return;
        const addr = (editingLoc.address || '').toLowerCase();
        if (addr.includes('карпенко')) {
            setEditingLoc(prev => ({ ...prev, lat: 55.160421, lon: 61.458923 }));
        } else if (addr.includes('труда')) {
            setEditingLoc(prev => ({ ...prev, lat: 55.169820, lon: 61.371240 }));
        } else if (addr.includes('8 марта') || addr.includes('миасс')) {
            setEditingLoc(prev => ({ ...prev, lat: 55.048000, lon: 60.108000 }));
        } else {
            setEditingLoc(prev => ({ ...prev, lat: 55.168134, lon: 61.284612 }));
        }
        alert("GPS координаты автоматически обновлены!");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLoc || !editingLoc.name || !editingLoc.address) {
            alert("Пожалуйста, укажите название и адрес зала");
            return;
        }

        const cityObj = cities.find(c => c.id === editingLoc.cityId) || CITIES[0];
        const targetId = editingLoc.id || `loc_${Date.now()}`;

        const validGalleryItems = (editingLoc.galleryItems || []).filter(item => Boolean(item.url));
        const primaryUrl = validGalleryItems[0]?.url || editingLoc.imageUrl || '';

        const payload: LocationItem = {
            id: targetId,
            cityId: editingLoc.cityId || 'chelyabinsk',
            city: cityObj.name,
            name: editingLoc.name || '',
            shortName: editingLoc.shortName || editingLoc.name || '',
            address: editingLoc.address || '',
            details: editingLoc.details || 'Главный вход, 1 этаж',
            parking: editingLoc.parking || 'Парковка у здания',
            lat: Number(editingLoc.lat) || 55.168134,
            lon: Number(editingLoc.lon) || 61.284612,
            phone: editingLoc.phone || '+7 (351) 230-12-69',
            badge: editingLoc.badge || '',
            imageUrl: primaryUrl,
            gallery: validGalleryItems.map(g => g.url),
            galleryItems: validGalleryItems,
            status: editingLoc.status || 'active'
        };

        try {
            await setDoc(doc(db, 'locations', targetId), payload);
            setIsModalOpen(false);
            setEditingLoc(null);
        } catch (err) {
            console.error("Error saving location:", err);
            alert("Ошибка сохранения");
        }
    };

    const toggleLocationVisibility = async (loc: LocationItem) => {
        const newStatus = loc.status === 'hidden' ? 'active' : 'hidden';
        try {
            await setDoc(doc(db, 'locations', loc.id), { ...loc, status: newStatus }, { merge: true });
        } catch (err) {
            console.error("Error toggling location visibility:", err);
        }
    };

    const handleDelete = async (locId: string) => {
        if (confirm("Удалить этот зал из списков?")) {
            try {
                await deleteDoc(doc(db, 'locations', locId));
            } catch (err) {
                console.error("Error deleting location:", err);
            }
        }
    };

    const filteredLocations = (!canManageCities || selectedCityId === 'all')
        ? locations
        : locations.filter(l => l.cityId === selectedCityId);

    // Get all photos for preview with titles
    const allPreviewItems: Array<{ url: string; title: string }> = (editingLoc?.galleryItems || [])
        .map((g: any, idx: number) => {
            if (typeof g === 'string') return { url: g, title: `Зона ${idx + 1}` };
            return { url: g?.url || '', title: g?.title || `Зона ${idx + 1}` };
        })
        .filter(g => Boolean(g.url));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                <div>
                    <div className="flex items-center gap-2 text-sparta-gold text-xs font-bold uppercase tracking-wider mb-1">
                        <MapPin size={16} />
                        Управление Залами и Географией
                    </div>
                    <h1 className="text-2xl font-russo text-white">Локации и Залы SPARTA</h1>
                    <p className="text-xs text-white/60 font-manrope mt-1">
                        Выбирайте несколько снимков одновременно и задавайте свои названия в 1 клик
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="bg-gold-gradient text-black font-russo px-5 py-3 rounded-2xl flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] text-sm shrink-0"
                >
                    <Plus size={18} />
                    Добавить новый зал
                </button>
            </div>

            {/* City Tabs Filter (Visible ONLY to Director & Developer) */}
            {canManageCities && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    <button
                        onClick={() => setSelectedCityId('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedCityId === 'all'
                                ? 'bg-gold-gradient text-black border-sparta-gold shadow-md'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                    >
                        Все города ({locations.length})
                    </button>
                    {cities.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCityId(c.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                selectedCityId === c.id
                                    ? 'bg-gold-gradient text-black border-sparta-gold shadow-md'
                                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                        >
                            {c.name} ({locations.filter(l => l.cityId === c.id).length})
                        </button>
                    ))}
                </div>
            )}

            {/* Locations Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLocations.map(loc => {
                    const cardPhotosCount = (loc.galleryItems?.length || (loc.gallery?.length ? loc.gallery.length : (loc.imageUrl ? 1 : 0)));
                    return (
                        <motion.div
                            key={loc.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 hover:border-sparta-gold/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group backdrop-blur-md transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                        >
                            {/* Image Preview Header */}
                            {loc.imageUrl ? (
                                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/10 group/img">
                                    <img src={loc.imageUrl} alt={loc.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                                            <Camera size={12} className="text-sparta-gold" /> Галерея: {cardPhotosCount} фото
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-28 rounded-2xl bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center text-white/40 text-xs">
                                    <ImageIcon size={22} className="mb-1 text-sparta-gold/70" />
                                    <span className="font-semibold text-white/60">Фото пока не загружены</span>
                                    <span className="text-[10px] text-white/40 mt-0.5">Нажмите «Редактировать» чтобы выбрать файлы</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-bold text-sparta-gold uppercase tracking-wider">{loc.city}</span>
                                        <h3 className="text-lg font-russo text-white">{loc.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {loc.status === 'hidden' && (
                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                                <EyeOff size={10} />
                                                Скрыт
                                            </span>
                                        )}
                                        {loc.badge && (
                                            <span className="px-2.5 py-1 bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 rounded-lg text-[10px] font-bold">
                                                {loc.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                                    <MapPin size={14} className="text-sparta-gold shrink-0" />
                                    {loc.address}
                                </p>

                                <div className="text-[11px] text-white/60 space-y-1 pt-2 border-t border-white/5 font-manrope">
                                    <div><strong>Вход:</strong> {loc.details}</div>
                                    <div><strong>Парковка:</strong> {loc.parking}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <button
                                        onClick={() => handleOpenModal(loc)}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all border border-white/10"
                                    >
                                        <Edit2 size={13} className="text-sparta-gold" />
                                        Редактировать
                                    </button>

                                    {/* 1-Click Visibility Toggle */}
                                    <button
                                        onClick={() => toggleLocationVisibility(loc)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                                            loc.status === 'hidden'
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                        }`}
                                        title={loc.status === 'hidden' ? 'Зал скрыт на сайте (Черновик). Нажмите, чтобы показать всем.' : 'Зал виден всем. Нажмите, чтобы скрыть.'}
                                    >
                                        {loc.status === 'hidden' ? <EyeOff size={13} /> : <Eye size={13} />}
                                        <span>{loc.status === 'hidden' ? 'Скрыт' : 'Виден'}</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPreviewLocationId(loc.id);
                                            setIsPreviewRouteOpen(true);
                                        }}
                                        className="px-3 py-2 rounded-xl bg-sparta-gold/15 hover:bg-sparta-gold hover:text-black text-xs font-bold text-sparta-gold flex items-center gap-1 transition-all border border-sparta-gold/30"
                                        title="Тест навигатора родителя"
                                    >
                                        <Eye size={13} />
                                        Тест
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleDelete(loc.id)}
                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/20"
                                    title="Удалить локацию"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* LIVE SPLIT-SCREEN MODAL WITH MULTI-FILE BATCH UPLOAD */}
            <AnimatePresence>
                {isModalOpen && editingLoc && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/85 backdrop-blur-lg"
                            onClick={() => setIsModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#121212] w-full max-w-5xl rounded-3xl border border-white/15 p-4 sm:p-6 shadow-2xl relative z-10 space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-sparta-gold/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-russo text-white">
                                            {editingLoc.id ? 'Редактировать Зал' : 'Добавить Новый Зал'}
                                        </h3>
                                        <p className="text-[11px] text-white/50 truncate max-w-[220px] sm:max-w-none">
                                            {isTouchDevice
                                                ? 'Выберите несколько снимков из галереи или с камеры'
                                                : 'Загружайте несколько файлов (Ctrl+V или перетащите мышкой)'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5">
                                    <X size={22} />
                                </button>
                            </div>

                            {/* 2-Column Split Layout: Form Left + Live Preview Right */}
                            <div className="space-y-4">
                                {/* Mobile View Switcher (Visible on Mobile/Tablet < lg) */}
                                <div className="flex lg:hidden bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setActiveModalTab('form')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            activeModalTab === 'form'
                                                ? 'bg-gold-gradient text-black font-extrabold shadow-md'
                                                : 'text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <Edit2 size={14} />
                                        Данные зала
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModalTab('preview')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            activeModalTab === 'preview'
                                                ? 'bg-gold-gradient text-black font-extrabold shadow-md'
                                                : 'text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <Eye size={14} />
                                        Предпросмотр ({allPreviewItems.length})
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    {/* LEFT COLUMN: Dynamic Custom Form (7 cols) */}
                                    <form onSubmit={handleSave} className={`lg:col-span-7 space-y-5 text-xs font-manrope ${activeModalTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                                    {/* 1. City & Name */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-white/70 mb-1 font-bold">1. Город</label>
                                            {canManageCities ? (
                                                <select
                                                    value={editingLoc.cityId || 'chelyabinsk'}
                                                    onChange={e => setEditingLoc({ ...editingLoc, cityId: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-semibold focus:border-sparta-gold outline-none"
                                                >
                                                    {cities.map(c => (
                                                        <option key={c.id} value={c.id} className="bg-black text-white">{c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sparta-gold font-bold text-xs flex items-center justify-between">
                                                    <span>Челябинск</span>
                                                    <span className="text-[10px] text-white/40 font-normal">Основной регион</span>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-white/70 mb-1 font-bold">Название Зала *</label>
                                            <input
                                                type="text"
                                                value={editingLoc.name || ''}
                                                onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })}
                                                placeholder="ОЦ «Ньютон»"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sparta-gold font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Street Address */}
                                    <div>
                                        <label className="block text-white/70 mb-1 font-bold">2. Улица и номер дома *</label>
                                        <input
                                            type="text"
                                            value={editingLoc.address || ''}
                                            onChange={e => setEditingLoc({ ...editingLoc, address: e.target.value })}
                                            placeholder="ул. 250-летия Челябинска, 46"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sparta-gold text-sparta-gold font-bold"
                                        />
                                    </div>

                                    {/* 3. BATCH MULTI-FILE UPLOAD DROPZONE */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e)}
                                        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all space-y-3 relative ${
                                            isDragging
                                                ? 'border-sparta-gold bg-sparta-gold/15 scale-[1.01]'
                                                : 'border-sparta-gold/40 bg-sparta-gold/5 hover:border-sparta-gold/80'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-sparta-gold/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                                                <Upload size={20} />
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-russo text-white">
                                                    {isTouchDevice ? 'Загрузить снимки из галереи' : 'Загрузить фотографии зала'}
                                                </h4>
                                                <p className="text-[11px] text-white/60 mt-0.5">
                                                    {isTouchDevice ? (
                                                        <>Нажмите кнопку ниже и выберите <strong>одно или несколько фото</strong> из памяти телефона</>
                                                    ) : (
                                                        <>Вы можете выделить <strong>сразу несколько фото</strong> в папке, нажать <strong>Ctrl+V</strong> или перетащить мышкой</>
                                                    )}
                                                </p>
                                            </div>

                                            <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-gold-gradient text-black font-russo flex items-center gap-2 hover:brightness-110 shadow-lg text-xs transition-all active:scale-95">
                                                <Camera size={16} />
                                                {uploading ? 'Загрузка снимков...' : 'Выбрать несколько файлов'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => handleFileInputChange(e)}
                                                    className="hidden"
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* 4. UNIFIED PHOTO GALLERY LIST WITH CUSTOM TITLES */}
                                    <div className="space-y-3 pt-3 border-t border-white/10">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-white font-bold flex items-center gap-1.5 text-xs">
                                                <Layers size={15} className="text-sparta-gold" />
                                                Галерея объекта ({editingLoc.galleryItems?.length || 0} фото)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addEmptyGallerySlot}
                                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 transition-all border border-white/10"
                                            >
                                                <Plus size={14} className="text-sparta-gold" />
                                                Новый объект
                                            </button>
                                        </div>

                                        {/* Gallery Cards 2-Column Responsive Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {(editingLoc.galleryItems || []).map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, idx)}
                                                    className={`border rounded-2xl p-3 space-y-2 transition-all relative flex flex-col justify-between ${
                                                        idx === 0
                                                            ? 'bg-sparta-gold/10 border-sparta-gold/50 shadow-md'
                                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    {/* Card Top Bar */}
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            {idx === 0 ? (
                                                                <span className="px-2 py-0.5 rounded-md bg-sparta-gold text-black text-[9px] font-extrabold uppercase flex items-center gap-1 shrink-0">
                                                                    <Star size={10} className="fill-black" />
                                                                    Обложка
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => makePrimaryPhoto(idx)}
                                                                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-sparta-gold hover:text-black text-white/70 text-[9px] font-bold transition-all border border-white/10 flex items-center gap-1 shrink-0"
                                                                    title="Сделать главным фото карточки"
                                                                >
                                                                    <Star size={9} /> Главное
                                                                </button>
                                                            )}
                                                            <span className="text-[9px] font-bold text-white/40">#{idx + 1}</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeGalleryItem(idx)}
                                                            className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all shrink-0"
                                                            title="Удалить фото"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Image Thumbnail */}
                                                    <div className="w-full">
                                                        {item.url ? (
                                                            <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/20 group/img">
                                                                <img src={item.url} alt="" className="w-full h-full object-cover" />
                                                                <label className="absolute inset-0 bg-black/40 hover:bg-black/70 opacity-60 hover:opacity-100 group-hover/img:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold cursor-pointer backdrop-blur-xs">
                                                                    <Edit2 size={13} className="mr-1" /> Заменить
                                                                    <input type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, idx)} className="hidden" />
                                                                </label>
                                                            </div>
                                                        ) : (
                                                            <label className="w-full h-24 rounded-xl bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center text-white/40 text-[10px] cursor-pointer hover:bg-white/10 transition-all">
                                                                <Plus size={16} className="text-sparta-gold mb-0.5" />
                                                                <span>Прикрепить</span>
                                                                <input type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, idx)} className="hidden" />
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* Custom Title Input */}
                                                    <div className="space-y-1">
                                                        <label className="block text-[9px] text-white/50 font-bold">Название зоны:</label>
                                                        <input
                                                            type="text"
                                                            value={item.title || ''}
                                                            onChange={(e) => updateGalleryTitle(idx, e.target.value)}
                                                            placeholder='например: "Вход со двора"'
                                                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-bold outline-none focus:border-sparta-gold"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            {(!editingLoc.galleryItems || editingLoc.galleryItems.length === 0) && (
                                                <div className="col-span-full p-4 rounded-xl bg-white/5 border border-dashed border-white/10 text-center text-white/40 text-xs">
                                                    Фотографии еще не прикреплены. Нажмите зеленую кнопку выше или перетащите файлы.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expandable Advanced Options */}
                                    <div className="pt-2 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className="text-xs font-bold text-sparta-gold hover:underline flex items-center gap-1.5 py-1"
                                        >
                                            <Settings size={14} />
                                            <span>{showAdvanced ? 'Скрыть дополнительные настройки' : 'Показать ориентацию входа, парковку и GPS'}</span>
                                            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        {showAdvanced && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-3 pt-3"
                                            >
                                                <div>
                                                    <label className="block text-white/60 mb-1 font-bold">Ориентир входа и этаж</label>
                                                    <input
                                                        type="text"
                                                        value={editingLoc.details || ''}
                                                        onChange={e => setEditingLoc({ ...editingLoc, details: e.target.value })}
                                                        placeholder="Главный вход, 1 этаж"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-sparta-gold"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-white/60 mb-1 font-bold">Инструкция по парковке</label>
                                                    <input
                                                        type="text"
                                                        value={editingLoc.parking || ''}
                                                        onChange={e => setEditingLoc({ ...editingLoc, parking: e.target.value })}
                                                        placeholder="Бесплатная парковка перед входом"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-sparta-gold"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-white/60 mb-1 font-bold">Бейдж/Метка</label>
                                                        <input
                                                            type="text"
                                                            value={editingLoc.badge || ''}
                                                            onChange={e => setEditingLoc({ ...editingLoc, badge: e.target.value })}
                                                            placeholder="Главный корпус"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-sparta-gold"
                                                        />
                                                    </div>

                                                    <div className="flex items-end">
                                                        <button
                                                            type="button"
                                                            onClick={autoEstimateGPS}
                                                            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-sparta-gold font-bold text-[11px] flex items-center justify-center gap-1 border border-sparta-gold/30"
                                                        >
                                                            <Navigation size={13} />
                                                            🎯 Авто GPS по адресу
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Sticky Submit Button Bar for Mobile Ergonomics */}
                                    <div className="sticky bottom-0 bg-[#121212]/95 backdrop-blur-md pt-3 pb-1 border-t border-white/10 mt-5 z-10">
                                        <button
                                            type="submit"
                                            className="w-full py-3.5 rounded-2xl font-russo bg-gold-gradient text-black text-sm sm:text-base hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.3)] active:scale-95"
                                        >
                                            <Save size={18} />
                                            Сохранить зал
                                        </button>
                                    </div>
                                </form>

                                {/* RIGHT COLUMN: Real-Time Live Parent Preview with Multi-Device Viewports (5 cols) */}
                                <div className={`lg:col-span-5 bg-black/60 border border-white/15 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl relative lg:sticky top-0 ${activeModalTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
                                    {/* Viewport Switcher Header */}
                                    <div className="flex flex-col gap-2 border-b border-white/10 pb-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-sparta-gold uppercase tracking-wider flex items-center gap-1.5">
                                                <Eye size={14} />
                                                Предпросмотр родителя
                                            </span>
                                            <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded font-mono">
                                                {previewDevice === 'mobile' ? '340px' : previewDevice === 'tablet' ? '460px' : 'Full HD'}
                                            </span>
                                        </div>

                                        {/* Multi-Device Tabs */}
                                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('mobile')}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                    previewDevice === 'mobile'
                                                        ? 'bg-gold-gradient text-black font-extrabold shadow-md scale-105'
                                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <Smartphone size={12} />
                                                Мобильный
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('tablet')}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                    previewDevice === 'tablet'
                                                        ? 'bg-gold-gradient text-black font-extrabold shadow-md scale-105'
                                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <Tablet size={12} />
                                                Планшет
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDevice('desktop')}
                                                className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                    previewDevice === 'desktop'
                                                        ? 'bg-gold-gradient text-black font-extrabold shadow-md scale-105'
                                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <Monitor size={12} />
                                                ПК
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Rendered Multi-Device Card Mockup Container */}
                                    <div
                                        className={`bg-[#181818] border border-white/15 rounded-2xl p-4 space-y-3.5 shadow-2xl relative transition-all duration-300 ${
                                            previewDevice === 'mobile'
                                                ? 'max-w-[340px] mx-auto'
                                                : previewDevice === 'tablet'
                                                ? 'max-w-[460px] mx-auto'
                                                : 'w-full'
                                        }`}
                                    >
                                        {/* Photo Carousel Header */}
                                        {allPreviewItems.length > 0 ? (
                                            <div className="space-y-2">
                                                <div
                                                    className={`relative w-full rounded-xl overflow-hidden border border-white/10 group shadow-lg transition-all duration-300 ${
                                                        previewDevice === 'mobile'
                                                            ? 'h-44'
                                                            : previewDevice === 'tablet'
                                                            ? 'h-52'
                                                            : 'h-60'
                                                    }`}
                                                >
                                                    <img
                                                        src={allPreviewItems[activePreviewPhotoIdx % allPreviewItems.length]?.url}
                                                        alt=""
                                                        className="w-full h-full object-cover transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                                                    
                                                    {/* Interactive Prev/Next Chevron Arrows */}
                                                    {allPreviewItems.length > 1 && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActivePreviewPhotoIdx((prev) => (prev - 1 + allPreviewItems.length) % allPreviewItems.length);
                                                                }}
                                                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 border border-white/20 text-white flex items-center justify-center hover:bg-sparta-gold hover:text-black transition-all shadow-md active:scale-90"
                                                                title="Предыдущее фото"
                                                            >
                                                                <ChevronLeft size={18} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActivePreviewPhotoIdx((prev) => (prev + 1) % allPreviewItems.length);
                                                                }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 border border-white/20 text-white flex items-center justify-center hover:bg-sparta-gold hover:text-black transition-all shadow-md active:scale-90"
                                                                title="Следующее фото"
                                                            >
                                                                <ChevronRight size={18} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Custom Title Overlay Badge */}
                                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                                                        <span className="text-[10px] font-bold text-white bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 truncate max-w-[78%]">
                                                            <Camera size={11} className="inline mr-1 text-sparta-gold" />
                                                            {allPreviewItems[activePreviewPhotoIdx % allPreviewItems.length]?.title || `Фото ${activePreviewPhotoIdx + 1}`}
                                                        </span>
                                                        <span className="text-[10px] text-sparta-gold font-extrabold bg-black/80 px-2 py-0.5 rounded border border-sparta-gold/30">
                                                            {(activePreviewPhotoIdx % allPreviewItems.length) + 1}/{allPreviewItems.length}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Device Selector Pill Strip */}
                                                {allPreviewItems.length > 1 && (
                                                    <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
                                                        {allPreviewItems.map((item, idx) => (
                                                            <button
                                                                type="button"
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActivePreviewPhotoIdx(idx);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all border flex items-center gap-1.5 ${
                                                                    idx === (activePreviewPhotoIdx % allPreviewItems.length)
                                                                        ? 'bg-gold-gradient text-black border-sparta-gold shadow-md shadow-sparta-gold/30 scale-105'
                                                                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                {item.title || `Зона ${idx + 1}`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-28 rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 text-xs">
                                                <ImageIcon size={22} className="mb-1 text-sparta-gold/40" />
                                                <span>Фото не прикреплены</span>
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="text-base font-russo text-white">
                                                {editingLoc.name || 'Название Зала'}
                                            </h4>
                                            <p className="text-xs font-semibold text-sparta-gold mt-0.5">
                                                {editingLoc.address || 'Адрес будет здесь'}
                                            </p>
                                        </div>

                                        <div className="space-y-1.5 pt-2 border-t border-white/10 text-[11px] text-white/80 font-manrope">
                                            <div className="flex items-start gap-1.5">
                                                <Building2 size={14} className="text-sparta-gold shrink-0 mt-0.5" />
                                                <span><strong>Вход:</strong> {editingLoc.details || 'Главный вход, 1 этаж'}</span>
                                            </div>
                                            <div className="flex items-start gap-1.5">
                                                <Car size={14} className="text-sparta-gold shrink-0 mt-0.5" />
                                                <span><strong>Парковка:</strong> {editingLoc.parking || 'Парковка у здания'}</span>
                                            </div>
                                        </div>

                                        {/* Yandex Navigator Button Mockup */}
                                        <div className="w-full bg-gold-gradient text-black font-russo text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md opacity-90 cursor-default">
                                            <Navigation size={16} className="fill-black" />
                                            <span>Открыть в Яндекс Навигаторе</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Test Route Modal for Admin */}
            <RouteModal
                isOpen={isPreviewRouteOpen}
                onClose={() => setIsPreviewRouteOpen(false)}
                initialLocationId={previewLocationId}
                locations={locations}
            />
        </div>
    );
};

export default AdminLocations;
