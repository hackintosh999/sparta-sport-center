import React, { useState, useEffect, useRef, Suspense } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Box, Check, Loader, Plus, Search, Trash2, X, Image as ImageIcon, UploadCloud, Trophy, Save, UserCheck, Users, Award, Sparkles, Star, RefreshCw } from 'lucide-react';
import { AchievementDefinition } from '../../types/shop';

const Viewer3D = React.lazy(() => import('../../components/Viewer3D'));

// Default seed definitions
const DEFAULT_ACHIEVEMENTS = [
    {
        title: "Первая тренировка",
        description: "Первый шаг в мир спорта, дисциплины и побед Спарта!",
        category: "Спорт",
        type: "2d",
        mediaUrl: "",
        rarity: "common"
    },
    {
        title: "10 тренировок подряд",
        description: "Железная дисциплина! Проведено 10 регулярных тренировок без пропусков.",
        category: "Дисциплина",
        type: "2d",
        mediaUrl: "",
        rarity: "rare"
    },
    {
        title: "Чемпион Спартакиады",
        description: "Высшая награда! Золотая медаль и титул Чемпиона Спартакиады.",
        category: "Особое",
        type: "2d",
        mediaUrl: "",
        rarity: "legendary"
    }
];

const AdminAchievements = () => {
    const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);

    // Editor State
    const [formData, setFormData] = useState<Partial<AchievementDefinition>>({
        title: '',
        description: '',
        category: 'Спорт',
        type: '2d',
        mediaUrl: '',
        rarity: 'common'
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Quick Assign Modal State
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedAchToAssign, setSelectedAchToAssign] = useState<AchievementDefinition | null>(null);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [assignReason, setAssignReason] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState<boolean>(false);

    // Categories
    const CATEGORIES = ["Спорт", "Дисциплина", "Мероприятия", "Учеба", "Особое"];

    // 1. Fetch Achievements & Auto-Seed if empty
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), async (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition));

            if (list.length === 0 && !isSeeding) {
                // Auto seed default achievements
                setIsSeeding(true);
                try {
                    for (const def of DEFAULT_ACHIEVEMENTS) {
                        await addDoc(collection(db, "achievement_definitions"), {
                            ...def,
                            createdAt: serverTimestamp()
                        });
                    }
                } catch (e) {
                    console.error("Error auto-seeding default achievements:", e);
                } finally {
                    setIsSeeding(false);
                }
            } else {
                setAchievements(list);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [isSeeding]);

    // 2. Fetch All Users to calculate "Выдано: X" metrics
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(usersList);
        });
        return () => unsubUsers();
    }, []);

    // Calculate granted count map
    const grantedCountMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        allUsers.forEach(u => {
            if (Array.isArray(u.achievements)) {
                u.achievements.forEach((ach: any) => {
                    const achId = ach.definitionId || ach.id;
                    if (achId) {
                        map[achId] = (map[achId] || 0) + 1;
                    }
                });
            }
        });
        return map;
    }, [allUsers]);

    const handleSeedDefaults = async () => {
        if (!window.confirm("Добавить базовый набор наград Спарта?")) return;
        setIsSeeding(true);
        try {
            for (const def of DEFAULT_ACHIEVEMENTS) {
                await addDoc(collection(db, "achievement_definitions"), {
                    ...def,
                    createdAt: serverTimestamp()
                });
            }
            alert("Базовые награды успешно добавлены!");
        } catch (e) {
            console.error("Error seeding defaults:", e);
            alert("Ошибка при сохранении наград");
        } finally {
            setIsSeeding(false);
        }
    };

    const handleOpenEditor = (item?: AchievementDefinition) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                category: 'Спорт',
                type: '2d',
                mediaUrl: '',
                rarity: 'common'
            });
        }
        setIsEditorOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setFormData(prev => ({ ...prev, mediaUrl: result }));
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.category) return;

        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "achievement_definitions", editingId), dataToSave);
                setSuccessMessage("Награда обновлена");
            } else {
                await addDoc(collection(db, "achievement_definitions"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Награда создана");
            }
            setTimeout(() => {
                setIsEditorOpen(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Удалить награду?")) {
            await deleteDoc(doc(db, "achievement_definitions", id));
        }
    };

    // Quick Assign Handler
    const handleOpenAssignModal = (ach: AchievementDefinition) => {
        setSelectedAchToAssign(ach);
        setSelectedStudentId('');
        setAssignReason('');
        setStudentSearchQuery('');
        setAssignModalOpen(true);
    };

    const handleAssignAchievement = async () => {
        if (!selectedAchToAssign || !selectedStudentId) return;
        setIsAssigning(true);

        try {
            const studentDoc = allUsers.find(u => u.id === selectedStudentId);
            if (!studentDoc) throw new Error("Ученик не найден");

            const currentAchievements = studentDoc.achievements || [];
            if (currentAchievements.some((a: any) => (a.definitionId || a.id) === selectedAchToAssign.id)) {
                alert("У данного ученика уже есть эта награда!");
                setIsAssigning(false);
                return;
            }

            const newAchievementObj = {
                id: selectedAchToAssign.id,
                definitionId: selectedAchToAssign.id,
                title: selectedAchToAssign.title,
                description: selectedAchToAssign.description || '',
                date: new Date().toISOString(),
                reason: assignReason.trim() || 'Выдано администратором'
            };

            const userRef = doc(db, "users", selectedStudentId);
            await updateDoc(userRef, {
                achievements: [...currentAchievements, newAchievementObj]
            });

            // Send notification
            if (studentDoc.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedStudentId,
                    email: studentDoc.email,
                    title: "Новая награда! 🏆",
                    message: `Поздравляем! Вам присвоена новая награда: ${selectedAchToAssign.title}`,
                    isRead: false,
                    type: 'system',
                    createdAt: serverTimestamp()
                });
            }

            alert(`Награда "${selectedAchToAssign.title}" успешно присвоена!`);
            setAssignModalOpen(false);
        } catch (err) {
            console.error("Error assigning achievement:", err);
            alert("Ошибка при присвоении награды");
        } finally {
            setIsAssigning(false);
        }
    };

    // Filter definitions
    const filtered = achievements.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter students for assignment
    const filteredStudents = allUsers.filter(u => {
        const name = (u.displayName || u.childName || u.childFullName || u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const queryStr = studentSearchQuery.toLowerCase();
        return name.includes(queryStr) || email.includes(queryStr);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white">
                <Loader className="animate-spin text-sparta-gold mb-3" size={32} />
                <p className="text-sm font-russo uppercase tracking-widest text-white/60">Загрузка наград...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                {/* TOP BAR */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-1 flex items-center gap-3">
                                <Trophy className="text-sparta-gold" size={32} />
                                Награды & Бейджи
                            </h1>
                            <p className="text-white/40 text-sm">Управление каталогом наград и присвоение ученикам</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSeedDefaults}
                                disabled={isSeeding}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider border border-white/10"
                                title="Создать стандартный набор наград"
                            >
                                <RefreshCw size={16} className={isSeeding ? 'animate-spin' : ''} />
                                Добавить шаблоны
                            </button>
                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold text-black font-russo py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
                            >
                                <Plus size={20} />
                                Создать награду
                            </button>
                        </div>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск награды по названию или категории..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:border-sparta-gold/50 outline-none transition-all text-sm"
                        />
                    </div>
                </div>

                {/* CARDS GRID */}
                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(item => {
                            const isLegendary = item.rarity === 'legendary';
                            const isRare = item.rarity === 'rare';
                            const grantedCount = grantedCountMap[item.id] || 0;

                            const cardBorder = isLegendary
                                ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-gradient-to-br from-[#1c1a12] via-[#141416] to-[#0a0a0c]'
                                : isRare
                                    ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-gradient-to-br from-[#121824] via-[#141416] to-[#0a0a0c]'
                                    : 'border-white/10 hover:border-white/20 bg-[#0F0F0F]';

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleOpenEditor(item)}
                                    className={`group relative border rounded-3xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between text-center ${cardBorder} ${editingId === item.id ? 'ring-2 ring-sparta-gold' : ''}`}
                                >
                                    {/* Action Buttons Top */}
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                                            ${isLegendary ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' :
                                                isRare ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/10 border-white/20 text-white/50'}`}>
                                            {item.rarity}
                                        </span>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(item.id);
                                            }}
                                            className="p-1.5 text-white/20 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                                            title="Удалить"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Preview Image / Model (Seamless Floating Asset) */}
                                    <div className="w-full h-36 mb-4 flex items-center justify-center relative my-2">
                                        {/* Ambient Rarity Glow */}
                                        <div className={`absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                                            isLegendary ? 'bg-yellow-500/35' : isRare ? 'bg-blue-500/25' : 'bg-white/10'
                                        }`} />

                                        <div className="relative z-10 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]">
                                            {item.type === '3d' && item.mediaUrl ? (
                                                <div className="relative flex flex-col items-center justify-center">
                                                    <Box size={44} className={isLegendary ? "text-sparta-gold" : isRare ? "text-blue-400" : "text-white"} />
                                                    <span className="mt-1 bg-black/80 border border-white/20 text-sparta-gold text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">3D Модель</span>
                                                </div>
                                            ) : item.mediaUrl ? (
                                                <img src={item.mediaUrl} className="w-28 h-28 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]" alt={item.title} />
                                            ) : (
                                                <Trophy size={56} className={isLegendary ? "text-yellow-500" : isRare ? "text-blue-400" : "text-white/60"} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-1 mb-4">
                                        <h3 className="text-base font-bold text-white group-hover:text-sparta-gold transition-colors font-russo line-clamp-1">{item.title}</h3>
                                        <p className="text-white/40 text-xs line-clamp-2 min-h-[32px]">{item.description || 'Награда Спарта'}</p>
                                    </div>

                                    {/* Metrics & Quick Assign */}
                                    <div className="space-y-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 text-[10px] uppercase font-bold">
                                                {item.category || 'Спорт'}
                                            </span>
                                            <span className="text-sparta-gold font-mono font-bold text-[11px] flex items-center gap-1">
                                                <Users size={12} />
                                                Выдано: {grantedCount}
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenAssignModal(item);
                                            }}
                                            className="w-full py-2 bg-sparta-gold/10 hover:bg-sparta-gold border border-sparta-gold/40 hover:border-sparta-gold text-sparta-gold hover:text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <UserCheck size={14} />
                                            Присвоить ученику
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* QUICK ASSIGN MODAL */}
            {assignModalOpen && selectedAchToAssign && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setAssignModalOpen(false)} />

                    <div className="bg-[#141416] border border-sparta-gold/30 rounded-3xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-sparta-gold">Присвоение награды</span>
                                <h3 className="text-xl font-russo text-white uppercase">{selectedAchToAssign.title}</h3>
                            </div>
                            <button onClick={() => setAssignModalOpen(false)} className="text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Student */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Выберите ученика</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Поиск ученика по имени..."
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-sparta-gold/50"
                                    />
                                </div>
                            </div>

                            {/* Students List */}
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-white/5 p-2 rounded-xl bg-black/40">
                                {filteredStudents.map(student => {
                                    const studentName = student.displayName || student.childName || student.childFullName || student.name || 'Спортсмен';
                                    const isSelected = selectedStudentId === student.id;

                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => setSelectedStudentId(student.id)}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-sparta-gold/20 border-sparta-gold text-white' : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-sparta-gold/20 text-sparta-gold font-bold flex items-center justify-center text-xs">
                                                    {studentName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold leading-tight">{studentName}</p>
                                                    <p className="text-[10px] text-white/40">{student.email || student.role || 'Пользователь'}</p>
                                                </div>
                                            </div>
                                            {isSelected && <Check size={16} className="text-sparta-gold" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Custom Reason */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Причина / Повод (необязательно)</label>
                                <input
                                    type="text"
                                    placeholder="Например: За 1 место в турнире или активность на тренировках"
                                    value={assignReason}
                                    onChange={(e) => setAssignReason(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sparta-gold/50"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAssignAchievement}
                                disabled={!selectedStudentId || isAssigning}
                                className="flex-1 py-3 bg-sparta-gold hover:bg-[#ffd700] disabled:opacity-50 text-black font-russo rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                            >
                                {isAssigning ? <Loader size={16} className="animate-spin" /> : <Award size={16} />}
                                <span>Выдать награду</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDITOR SIDEBAR */}
            <div className={`fixed inset-y-0 right-0 w-[500px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать' : 'Новая награда'}</h2>
                    <button onClick={() => setIsEditorOpen(false)} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Media Preview/Upload */}
                    <div className="space-y-3">
                        <div className="w-full h-64 bg-black/50 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden relative">
                            {formData.mediaUrl ? (
                                formData.type === '3d' ? (
                                    <Suspense fallback={
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                                            <div className="w-8 h-8 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    }>
                                        <Viewer3D url={formData.mediaUrl} />
                                    </Suspense>
                                ) : (
                                    <img src={formData.mediaUrl} className="w-full h-full object-contain" alt="" />
                                )
                            ) : (
                                <div className="flex flex-col items-center text-white/20">
                                    <UploadCloud size={48} className="mb-2" />
                                    <span className="text-sm">Перетащите или выберите файл</span>
                                </div>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <Loader className="animate-spin text-sparta-gold" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                                <ImageIcon size={16} className="text-white/60" />
                                <span className="text-sm font-bold text-white">Загрузить 2D</span>
                                <input type="file" accept="image/*" onChange={(e) => {
                                    setFormData({ ...formData, type: '2d' });
                                    handleFileUpload(e);
                                }} className="hidden" />
                            </label>

                            <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                                <Box size={16} className="text-white/60" />
                                <span className="text-sm font-bold text-white">Загрузить 3D (.glb)</span>
                                <input type="file" accept=".glb,.gltf" onChange={(e) => {
                                    setFormData({ ...formData, type: '3d' });
                                    handleFileUpload(e);
                                }} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Название</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                placeholder="Кубок Чемпиона"
                            />
                        </div>

                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Описание</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none h-24 resize-none"
                                placeholder="За что выдается..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Категория</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Редкость</label>
                                <select
                                    value={formData.rarity}
                                    onChange={e => setFormData({ ...formData, rarity: e.target.value as any })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                                >
                                    <option value="common">Обычная</option>
                                    <option value="rare">Редкая</option>
                                    <option value="legendary">Легендарная</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={handleSave}
                        className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminAchievements;

