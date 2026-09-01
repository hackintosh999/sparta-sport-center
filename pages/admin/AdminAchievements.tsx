import React, { useState, useEffect, useRef, Suspense } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import {
    Box, Check, Loader, Plus, Search, Trash2, X, Image as ImageIcon,
    UploadCloud, Trophy, Save, UserCheck, Users, Award, Sparkles, Star,
    RefreshCw, Coins, Crown, Shield, Zap, Flame, Eye, Layers, CheckCircle2
} from 'lucide-react';
import { AchievementDefinition } from '../../types/shop';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import AdminAwardsManager from '../../components/admin/AdminAwardsManager';

const Viewer3D = lazyWithRetry(() => import('../../components/Viewer3D'));

// 🏆 PRESET TROPHIES & COMMENDATIONS CATALOG
export const TROPHY_PRESETS = [
    // 📜 1. DIPLOMAS & COMMENDATIONS FOR DILIGENCE & EFFORT (Грамоты за старания)
    {
        id: 'diploma_effort',
        name: 'Грамота за Старания',
        category: 'Старания и Характер',
        rarity: 'legendary' as const,
        awardType: 'diploma' as const,
        icon: '📜',
        defaultTitle: 'Похвальная Грамота «За Железную Волю и Старания»',
        defaultDesc: 'Награда за несгибаемое упорство, верность своей мечте и готовность выкладываться на все 100% на каждой тренировке. Твой пот и труд на поле превращаются в силу духа!',
        defaultMotto: 'Истинный спартанец побеждает усталость и никогда не сдается!'
    },
    {
        id: 'diploma_progress',
        name: 'Диплом Прорыва',
        category: 'Старания и Характер',
        rarity: 'rare' as const,
        awardType: 'diploma' as const,
        icon: '🌟',
        defaultTitle: 'Почетный Диплом «Прорыв Месяца & Сила Прогресса»',
        defaultDesc: 'Присуждается за колоссальный скачок в технике, мастерстве и физической подготовке. Твое внимание к подсказкам наставников принесло великолепный результат!',
        defaultMotto: 'Труд и вера в себя способны творить настоящие чудеса!'
    },
    {
        id: 'diploma_discipline',
        name: 'Грамота Дисциплины',
        category: 'Дисциплина',
        rarity: 'rare' as const,
        awardType: 'diploma' as const,
        icon: '🛡️',
        defaultTitle: 'Грамота «Спартанский Дух и Безупречная Дисциплина»',
        defaultDesc: 'Награда за железный характер, пунктуальность и 100% верность тренировочному процессу. Ты образец стойкости и надежности для всей команды!',
        defaultMotto: 'Дисциплина — это мост между мечтой и ее достижением!'
    },
    {
        id: 'diploma_team',
        name: 'Сертификат Единства',
        category: 'Команда',
        rarity: 'rare' as const,
        awardType: 'certificate' as const,
        icon: '🤝',
        defaultTitle: 'Сертификат «Золотое Сердце Команды & Благородство»',
        defaultDesc: 'Вручается спортсмену, который всегда готов подать руку товарищу, поддержать в трудную минуту и поставить командный успех превыше личной славы.',
        defaultMotto: 'Один за всех, и все за одного — нерушимый закон Спарты!'
    },
    {
        id: 'diploma_mastery',
        name: 'Сертификат Победы',
        category: 'Старания и Характер',
        rarity: 'legendary' as const,
        awardType: 'certificate' as const,
        icon: '🎯',
        defaultTitle: 'Сертификат «Личная Победа & Преодоление Страха»',
        defaultDesc: 'Самая главная победа в спорте — это победа над собственными сомнениями. Ты вышел на поле, преодолел неуверенность и показал бойцовский дух!',
        defaultMotto: 'Смелость — это победа над своими сомнениями!'
    },
    {
        id: 'diploma_energy',
        name: 'Огонь Тренировки',
        category: 'Энергия и Страсть',
        rarity: 'common' as const,
        awardType: 'certificate' as const,
        icon: '⚡',
        defaultTitle: 'Сертификат «Неугасимый Огонь & Энергия Тренировки»',
        defaultDesc: 'За неиссякаемый задор, спортивный азарт и огонь в глазах, который заряжает энергией всю команду и превращает тренировку в праздник спорта!',
        defaultMotto: 'Гори сам и зажигай сердца товарищей!'
    },

    // 🏆 2. CUPS, MEDALS & PHYSICAL TROPHIES (Кубки и Трофеи)
    {
        id: 'cup_gold',
        name: 'Золотой Кубок',
        category: 'Спорт',
        rarity: 'legendary' as const,
        awardType: 'trophy' as const,
        icon: '🏆',
        defaultTitle: 'Кубок Чемпиона Спарты',
        defaultDesc: 'Высшая награда за победу в турнире и безупречную спортивную форму.'
    },
    {
        id: 'ball_gold',
        name: 'Золотой Мяч',
        category: 'Спорт',
        rarity: 'legendary' as const,
        awardType: 'trophy' as const,
        icon: '⚽',
        defaultTitle: 'Золотой Мяч Бомбардира',
        defaultDesc: 'За наибольшее количество забитых мячей и мастерство на поле.'
    },
    {
        id: 'shield_sparta',
        name: 'Спартанский Щит',
        category: 'Дисциплина',
        rarity: 'rare' as const,
        awardType: 'shield' as const,
        icon: '🛡️',
        defaultTitle: 'Щит Непоколебимой Дисциплины',
        defaultDesc: 'За стойкость, железную волю и 10 регулярных тренировок без пропусков.'
    },
    {
        id: 'crown_captain',
        name: 'Корона Капитана',
        category: 'Особое',
        rarity: 'legendary' as const,
        awardType: 'trophy' as const,
        icon: '👑',
        defaultTitle: 'Капитан и Лидер Команды',
        defaultDesc: 'За лидерские качества, поддержку партнеров и ведение команды к победам.'
    },
    {
        id: 'medal_gold',
        name: 'Золотая Медаль',
        category: 'Спорт',
        rarity: 'legendary' as const,
        awardType: 'trophy' as const,
        icon: '🥇',
        defaultTitle: 'Золотая Медаль Триумфатора',
        defaultDesc: 'Победитель официального первенства и клубного кубка Спарты.'
    },
    {
        id: 'medal_silver',
        name: 'Серебряная Медаль',
        category: 'Спорт',
        rarity: 'rare' as const,
        awardType: 'trophy' as const,
        icon: '🥈',
        defaultTitle: 'Серебряный Призер',
        defaultDesc: 'Почетное 2 место на турнире и великолепная командная игра.'
    },
    {
        id: 'crystal_diamond',
        name: 'Алмазный Кристалл',
        category: 'Особое',
        rarity: 'legendary' as const,
        awardType: 'trophy' as const,
        icon: '💎',
        defaultTitle: 'Кристалл Совершенства',
        defaultDesc: 'За исключительную технику, прогресс и преданность спорту.'
    },
    {
        id: 'star_hero',
        name: 'Звезда Героя',
        category: 'Особое',
        rarity: 'rare' as const,
        awardType: 'trophy' as const,
        icon: '🌟',
        defaultTitle: 'Звезда Восходящего Чемпиона',
        defaultDesc: 'За выдающийся дебют, смелость и первые спортивные триумфы.'
    }
];

const DEFAULT_ACHIEVEMENTS = [
    {
        title: "Похвальная Грамота «За Железную Волю и Старания»",
        description: "Награда за несгибаемое упорство, верность своей мечте и готовность выкладываться на все 100% на каждой тренировке.",
        category: "Старания и Характер",
        type: "2d",
        mediaUrl: "",
        iconPreset: "diploma_effort",
        awardType: "diploma",
        motto: "Истинный спартанец побеждает усталость и никогда не сдается!",
        rarity: "legendary",
        rewardCoins: 50
    },
    {
        title: "Первая тренировка",
        description: "Первый шаг в мир спорта, дисциплины и побед Спарта!",
        category: "Спорт",
        type: "2d",
        mediaUrl: "",
        iconPreset: "medal_gold",
        awardType: "trophy",
        rarity: "common",
        rewardCoins: 25
    },
    {
        title: "10 тренировок подряд",
        description: "Железная дисциплина! Проведено 10 регулярных тренировок без пропусков.",
        category: "Дисциплина",
        type: "2d",
        mediaUrl: "",
        iconPreset: "shield_sparta",
        awardType: "shield",
        rarity: "rare",
        rewardCoins: 50
    },
    {
        title: "Чемпион Спартакиады",
        description: "Высшая награда! Золотой кубок и почетный титул Чемпиона Спарты.",
        category: "Особое",
        type: "2d",
        mediaUrl: "",
        iconPreset: "cup_gold",
        awardType: "trophy",
        rarity: "legendary",
        rewardCoins: 100
    }
];

const AdminAchievements: React.FC = () => {
    const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSeeding, setIsSeeding] = useState<boolean>(false);
    const [activeViewTab, setActiveViewTab] = useState<'catalog' | 'hall_of_fame'>('catalog');

    // Editor Form State
    const [formData, setFormData] = useState<Partial<AchievementDefinition>>({
        title: '',
        description: '',
        category: 'Старания и Характер',
        type: '2d',
        mediaUrl: '',
        iconPreset: 'diploma_effort',
        awardType: 'diploma',
        motto: '',
        rarity: 'common',
        rewardCoins: 50
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Quick Assign Modal State
    const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
    const [selectedAchToAssign, setSelectedAchToAssign] = useState<AchievementDefinition | null>(null);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [assignReason, setAssignReason] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState<boolean>(false);

    const CATEGORIES = [
        "Старания и Характер",
        "Спорт",
        "Дисциплина",
        "Команда",
        "Энергия и Страсть",
        "Мероприятия",
        "Учеба",
        "Особое"
    ];

    // 1. Live Sync from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), async (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition));

            if (list.length === 0 && !isSeeding) {
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

    // 2. Fetch Users
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
                    if (achId) map[achId] = (map[achId] || 0) + 1;
                });
            }
        });
        return map;
    }, [allUsers]);

    const handleSelectPreset = (preset: typeof TROPHY_PRESETS[0]) => {
        setFormData(prev => ({
            ...prev,
            iconPreset: preset.id,
            category: preset.category,
            rarity: preset.rarity,
            awardType: preset.awardType || 'trophy',
            motto: preset.defaultMotto || '',
            mediaUrl: '',
            title: prev.title ? prev.title : preset.defaultTitle,
            description: prev.description ? prev.description : preset.defaultDesc
        }));
    };

    const handleOpenEditor = (item?: AchievementDefinition) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                ...item,
                rewardCoins: item.rewardCoins || 50,
                iconPreset: item.iconPreset || 'diploma_effort',
                awardType: item.awardType || 'diploma',
                motto: item.motto || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                category: 'Старания и Характер',
                type: '2d',
                mediaUrl: '',
                iconPreset: 'diploma_effort',
                awardType: 'diploma',
                motto: '',
                rarity: 'legendary',
                rewardCoins: 50
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
            setFormData(prev => ({ ...prev, mediaUrl: result, iconPreset: 'custom_upload' }));
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!formData.title?.trim() || !formData.category) {
            alert("Пожалуйста, укажите название и категорию награды!");
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                title: formData.title.trim(),
                description: formData.description?.trim() || '',
                category: formData.category,
                type: formData.type || '2d',
                mediaUrl: formData.mediaUrl || '',
                iconPreset: formData.iconPreset || 'cup_gold',
                awardType: formData.awardType || 'trophy',
                motto: formData.motto?.trim() || '',
                rarity: formData.rarity || 'common',
                rewardCoins: Number(formData.rewardCoins) || 0,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "achievement_definitions", editingId), dataToSave);
                setSuccessMessage("Награда успешно обновлена!");
            } else {
                await addDoc(collection(db, "achievement_definitions"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Новая награда добавлена в Зал Славы!");
            }

            setTimeout(() => {
                setIsEditorOpen(false);
                setSuccessMessage(null);
                setIsSaving(false);
            }, 800);
        } catch (error) {
            console.error("Save error:", error);
            alert("Ошибка при сохранении награды в базе данных");
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`Удалить награду "${title}" из каталога Зала Славы?`)) {
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
                reason: assignReason.trim() || 'Присвоено администратором'
            };

            const userRef = doc(db, "users", selectedStudentId);
            const updates: any = {
                achievements: [...currentAchievements, newAchievementObj]
            };

            // If coin reward is defined, award coins too
            if (selectedAchToAssign.rewardCoins && selectedAchToAssign.rewardCoins > 0) {
                updates.bonuses = (studentDoc.bonuses || 0) + selectedAchToAssign.rewardCoins;
            }

            await updateDoc(userRef, updates);

            // Send push notification
            if (studentDoc.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedStudentId,
                    email: studentDoc.email,
                    title: "Новая награда в Зале Славы! 🏆",
                    message: `Поздравляем! Вам присвоен трофей: ${selectedAchToAssign.title}${selectedAchToAssign.rewardCoins ? ` (+${selectedAchToAssign.rewardCoins} монет!)` : ''}`,
                    isRead: false,
                    type: 'system',
                    createdAt: serverTimestamp()
                });
            }

            alert(`Трофей "${selectedAchToAssign.title}" успешно присвоен спортсмену!`);
            setAssignModalOpen(false);
        } catch (err) {
            console.error("Error assigning achievement:", err);
            alert("Ошибка при присвоении награды");
        } finally {
            setIsAssigning(false);
        }
    };

    const filtered = achievements.filter(a =>
        (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStudents = allUsers.filter(u => {
        const name = (u.displayName || u.childName || u.childFullName || u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const queryStr = studentSearchQuery.toLowerCase();
        return name.includes(queryStr) || email.includes(queryStr);
    });

    const [presetCategoryTab, setPresetCategoryTab] = useState<'all' | 'diplomas' | 'cups' | 'shields'>('diplomas');
    const [editorTab, setEditorTab] = useState<'presets' | 'custom'>('presets');

    const filteredPresets = TROPHY_PRESETS.filter(p => {
        if (presetCategoryTab === 'diplomas') return p.awardType === 'diploma' || p.awardType === 'certificate' || p.id.startsWith('diploma_');
        if (presetCategoryTab === 'cups') return p.awardType === 'trophy' || p.id.startsWith('cup_') || p.id.startsWith('ball_') || p.id.startsWith('medal_') || p.id.startsWith('crown_');
        if (presetCategoryTab === 'shields') return p.awardType === 'shield' || p.id.startsWith('shield_') || p.id.startsWith('star_') || p.id.startsWith('crystal_');
        return true;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white">
                <Loader className="animate-spin text-sparta-gold mb-3" size={32} />
                <p className="text-sm font-russo uppercase tracking-widest text-white/60">Загрузка наград Зала Славы...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            <div className="flex-1 flex flex-col transition-all duration-300">
                {/* TOP BAR */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-1 flex items-center gap-3">
                                <Trophy className="text-sparta-gold" size={32} />
                                <span>Зал Славы & Каталог Наград</span>
                            </h1>
                            <p className="text-white/40 text-sm">
                                Добавляйте награды и грамоты, настраивайте 3D-экспонаты и присваивайте их спортсменам онлайн
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold text-black font-russo py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2 text-sm uppercase tracking-wider cursor-pointer active:scale-95"
                            >
                                <Plus size={20} />
                                Добавить награду / грамоту
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск награды по названию или категории..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:border-sparta-gold/50 outline-none transition-all text-sm"
                            />
                        </div>

                        {/* View Switcher Tabs */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setActiveViewTab('catalog')}
                                className={`px-4 py-2 rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeViewTab === 'catalog'
                                        ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20'
                                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Trophy size={14} />
                                <span>Каталог & Выдача (awards_catalog)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveViewTab('hall_of_fame')}
                                className={`px-4 py-2 rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeViewTab === 'hall_of_fame'
                                        ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20'
                                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Award size={14} />
                                <span>3D Экспонаты</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTENT SECTION */}
                {activeViewTab === 'catalog' ? (
                    <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden custom-scrollbar">
                        <AdminAwardsManager />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(item => {
                            const isLegendary = item.rarity === 'legendary';
                            const isRare = item.rarity === 'rare';
                            const grantedCount = grantedCountMap[item.id] || 0;

                            const preset = TROPHY_PRESETS.find(p => p.id === item.iconPreset);

                            const cardBorder = isLegendary
                                ? 'border-amber-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-gradient-to-br from-[#1c1a12] via-[#141416] to-[#0a0a0c]'
                                : isRare
                                    ? 'border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)] bg-gradient-to-br from-[#121824] via-[#141416] to-[#0a0a0c]'
                                    : 'border-white/10 hover:border-white/20 bg-[#0F0F0F]';

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleOpenEditor(item)}
                                    className={`group relative border rounded-3xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between text-center ${cardBorder} ${editingId === item.id ? 'ring-2 ring-sparta-gold' : ''}`}
                                >
                                    {/* Action Buttons Top */}
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border
                                            ${isLegendary ? 'bg-amber-500/20 border-amber-500 text-amber-300' :
                                                isRare ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-white/10 border-white/20 text-white/60'}`}>
                                            {item.rarity === 'legendary' ? '👑 Легендарный' : item.rarity === 'rare' ? '💎 Редкий' : '⭐ Награда'}
                                        </span>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(item.id, item.title);
                                            }}
                                            className="p-1.5 text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                                            title="Удалить"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Icon / Image Display */}
                                    <div className="w-full h-32 mb-3 flex items-center justify-center relative">
                                        <div className="text-6xl drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] transform group-hover:scale-110 transition-transform">
                                            {item.mediaUrl ? (
                                                <img src={item.mediaUrl} alt={item.title} className="w-24 h-24 object-contain" />
                                            ) : (
                                                preset?.icon || '🏆'
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-1 mb-3">
                                        <h3 className="text-base font-bold text-white group-hover:text-sparta-gold transition-colors font-russo line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-white/40 text-xs line-clamp-2 min-h-[32px]">
                                            {item.description || 'Награда Спарты'}
                                        </p>
                                    </div>

                                    {/* Metrics & Quick Assign */}
                                    <div className="space-y-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/50 text-[10px] uppercase font-bold">
                                                {item.category || 'Спорт'}
                                            </span>

                                            {item.rewardCoins ? (
                                                <span className="text-amber-300 font-bold text-[11px] flex items-center gap-1">
                                                    <Coins size={12} />
                                                    +{item.rewardCoins}
                                                </span>
                                            ) : null}

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
                                            className="w-full py-2 bg-sparta-gold/15 hover:bg-sparta-gold border border-sparta-gold/40 hover:border-sparta-gold text-sparta-gold hover:text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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
                )}
            </div>

            {/* QUICK ASSIGN MODAL */}
            {assignModalOpen && selectedAchToAssign && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setAssignModalOpen(false)} />

                    <div className="bg-[#101014] border border-sparta-gold/40 rounded-3xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-sparta-gold">Присвоение награды</span>
                                <h3 className="text-xl font-russo text-white uppercase">{selectedAchToAssign.title}</h3>
                            </div>
                            <button onClick={() => setAssignModalOpen(false)} className="text-white/40 hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

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

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-white/5 p-2 rounded-xl bg-black/50 custom-scrollbar">
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

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1.5">Причина / Повод (будет напечатано в сертификате)</label>
                                <input
                                    type="text"
                                    placeholder="Например: За 1 место в турнире или отличный прогресс"
                                    value={assignReason}
                                    onChange={(e) => setAssignReason(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sparta-gold/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAssignAchievement}
                                disabled={!selectedStudentId || isAssigning}
                                className="flex-1 py-3 bg-sparta-gold hover:bg-[#ffd700] disabled:opacity-50 text-black font-russo rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                {isAssigning ? <Loader size={16} className="animate-spin" /> : <Award size={16} />}
                                <span>Выдать награду</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌑 SOLID DARK BACKDROP OVERLAY FOR EDITOR */}
            {isEditorOpen && (
                <div
                    className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 transition-opacity duration-300"
                    onClick={() => setIsEditorOpen(false)}
                />
            )}

            {/* 🛠️ PREMIUM OPAQUE DARK EDITOR DRAWER */}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-[580px] bg-[#0f0f13] border-l border-white/15 shadow-[-20px_0_60px_rgba(0,0,0,0.95)] transform transition-transform duration-300 ease-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-white/10 flex justify-between items-center bg-[#14141a]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 border border-sparta-gold/40 flex items-center justify-center text-sparta-gold">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white font-russo">
                                {editingId ? 'Редактировать награду' : 'Создание новой награды'}
                            </h2>
                            <span className="text-[11px] text-white/50">Мгновенная синхронизация с профилями детей</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditorOpen(false)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Tabs between Templates and Details */}
                <div className="flex items-center gap-2 p-3 bg-[#0a0a0d] border-b border-white/10 px-6">
                    <button
                        type="button"
                        onClick={() => setEditorTab('presets')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            editorTab === 'presets'
                                ? 'bg-sparta-gold text-black font-russo shadow-md'
                                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>1. Готовые шаблоны (1 клик)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditorTab('custom')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            editorTab === 'custom'
                                ? 'bg-sparta-gold text-black font-russo shadow-md'
                                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Award size={14} />
                        <span>2. Детали и параметры</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar bg-[#0f0f13]">
                    {/* Success Alert */}
                    {successMessage && (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
                            <CheckCircle2 size={18} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* TAB 1: PRESETS CATALOG (Clean categorized cards) */}
                    {editorTab === 'presets' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                    Выберите категорию шаблона:
                                </span>
                            </div>

                            {/* Preset Category Pills */}
                            <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-2xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPresetCategoryTab('diplomas')}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        presetCategoryTab === 'diplomas'
                                            ? 'bg-amber-400 text-black font-russo shadow-sm'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    📜 Грамоты (6)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetCategoryTab('cups')}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        presetCategoryTab === 'cups'
                                            ? 'bg-amber-500 text-black font-russo shadow-sm'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    🏆 Кубки (5)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetCategoryTab('shields')}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        presetCategoryTab === 'shields'
                                            ? 'bg-blue-500 text-black font-russo shadow-sm'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    🛡️ Щиты (3)
                                </button>
                            </div>

                            {/* Large Clear Preset Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredPresets.map(preset => {
                                    const isSelected = formData.iconPreset === preset.id && !formData.mediaUrl;
                                    return (
                                        <div
                                            key={preset.id}
                                            onClick={() => {
                                                handleSelectPreset(preset);
                                                setEditorTab('custom');
                                            }}
                                            className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 transition-all cursor-pointer text-left ${
                                                isSelected
                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-white shadow-lg ring-1 ring-sparta-gold'
                                                    : 'bg-white/[0.04] border-white/10 hover:border-sparta-gold/40 hover:bg-white/[0.07] text-white/80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-3xl drop-shadow-md">{preset.icon}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                    preset.rarity === 'legendary'
                                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                        : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                                                }`}>
                                                    {preset.rarity === 'legendary' ? 'Легендарная' : 'Редкая'}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="font-russo text-xs text-white line-clamp-1">{preset.name}</h4>
                                                <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5 leading-tight">
                                                    {preset.defaultTitle}
                                                </p>
                                            </div>

                                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                                                <span className="text-sparta-gold font-bold">{preset.category}</span>
                                                <span className="text-white/40 group-hover:text-white font-medium">Выбрать →</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PARAMETERS & LIVE PREVIEW */}
                    {editorTab === 'custom' && (
                        <div className="space-y-5">
                            {/* Live Miniature Preview Banner */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#18150c] to-[#0f0f13] border border-sparta-gold/30 flex items-center gap-4 shadow-inner">
                                <div className="w-16 h-16 rounded-2xl bg-black/60 border border-sparta-gold/40 flex items-center justify-center text-3xl shrink-0 shadow-md">
                                    {formData.mediaUrl ? (
                                        <img src={formData.mediaUrl} alt="preview" className="w-12 h-12 object-contain" />
                                    ) : (
                                        TROPHY_PRESETS.find(p => p.id === formData.iconPreset)?.icon || '🏆'
                                    )}
                                </div>
                                <div className="space-y-0.5 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase text-sparta-gold tracking-widest px-2 py-0.5 rounded-full bg-sparta-gold/15 border border-sparta-gold/30">
                                            {formData.awardType === 'diploma' ? '📜 Грамота' : formData.awardType === 'certificate' ? '🎯 Сертификат' : '🏆 Трофей'}
                                        </span>
                                        <span className="text-[10px] text-amber-300 font-bold">+{formData.rewardCoins ?? 50} 🪙</span>
                                    </div>
                                    <h4 className="font-russo text-sm text-white truncate">{formData.title || 'Без названия'}</h4>
                                    <p className="text-[10px] text-white/50 truncate italic">{formData.motto || formData.description || 'Описание награды'}</p>
                                </div>
                            </div>

                            {/* Section 1: Main Texts */}
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sparta-gold flex items-center gap-1">
                                    <Award size={12} />
                                    <span>Текстовое оформление</span>
                                </span>

                                <div>
                                    <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Название награды или грамоты</label>
                                    <input
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-[#18181f] border border-white/15 rounded-xl p-3 text-white focus:border-sparta-gold outline-none text-xs font-russo"
                                        placeholder="Похвальная Грамота «За Железную Волю и Старания»"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Описание / За что выдается</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-[#18181f] border border-white/15 rounded-xl p-3 text-white focus:border-sparta-gold outline-none h-20 resize-none text-xs"
                                        placeholder="За несгибаемое упорство, верность своей мечте и готовность выкладываться на все 100% на каждой тренировке..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Вдохновляющий девиз (печатается на грамоте)</label>
                                    <input
                                        value={formData.motto || ''}
                                        onChange={e => setFormData({ ...formData, motto: e.target.value })}
                                        className="w-full bg-[#18181f] border border-white/15 rounded-xl p-3 text-white focus:border-sparta-gold outline-none text-xs italic text-amber-300"
                                        placeholder="«Истинный спартанец побеждает усталость и никогда не сдается!»"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Properties & Rewards */}
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sparta-gold flex items-center gap-1">
                                    <Sparkles size={12} />
                                    <span>Параметры и вознаграждение</span>
                                </span>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Категория</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-[#18181f] border border-white/15 rounded-xl p-2.5 text-white focus:border-sparta-gold outline-none text-xs [&>option]:bg-black"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Тип награды</label>
                                        <select
                                            value={formData.awardType || 'diploma'}
                                            onChange={e => setFormData({ ...formData, awardType: e.target.value as any })}
                                            className="w-full bg-[#18181f] border border-white/15 rounded-xl p-2.5 text-white focus:border-sparta-gold outline-none text-xs [&>option]:bg-black"
                                        >
                                            <option value="diploma">📜 Похвальная грамота / Диплом</option>
                                            <option value="certificate">🎯 Сертификат признания</option>
                                            <option value="trophy">🏆 Кубок / Медаль</option>
                                            <option value="shield">🛡️ Спартанский щит</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Редкость</label>
                                        <select
                                            value={formData.rarity}
                                            onChange={e => setFormData({ ...formData, rarity: e.target.value as any })}
                                            className="w-full bg-[#18181f] border border-white/15 rounded-xl p-2.5 text-white focus:border-sparta-gold outline-none text-xs [&>option]:bg-black"
                                        >
                                            <option value="common">⭐ Обычная</option>
                                            <option value="rare">💎 Редкая</option>
                                            <option value="legendary">👑 Легендарная</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/50 text-[11px] font-bold uppercase mb-1">Бонус спарта-монет (+🪙)</label>
                                        <input
                                            type="number"
                                            value={formData.rewardCoins ?? 50}
                                            onChange={e => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                                            className="w-full bg-[#18181f] border border-white/15 rounded-xl p-2.5 text-white focus:border-sparta-gold outline-none text-xs"
                                            placeholder="50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Optional Custom File Upload */}
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                                <label className="block text-white/50 text-[11px] font-bold uppercase">Или загрузите свой 2D/3D файл</label>
                                <label className="w-full bg-[#18181f] hover:bg-[#202028] border border-dashed border-white/20 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                                    <UploadCloud size={16} className="text-sparta-gold" />
                                    <span className="text-xs font-bold text-white">
                                        {formData.mediaUrl ? 'Файл прикреплен (нажмите для замены)' : 'Выбрать PNG / SVG / GLTF'}
                                    </span>
                                    <input type="file" accept="image/*,.glb,.gltf" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-white/10 bg-[#14141a] flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-sparta-gold text-black font-russo py-3.5 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Сохранить в Зал Славы</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminAchievements;


