import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Award, Scroll, Plus, Search, Check, Users, User,
    Sparkles, Trash2, Edit2, Coins, Zap, Shield, Gift, AlertCircle,
    CheckCircle2, Loader2, X
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection, addDoc, getDocs, onSnapshot, doc, updateDoc,
    deleteDoc, serverTimestamp, increment, query, where, arrayUnion
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { SpartaCoinIcon } from '../SpartaCoinIcon';
import confetti from 'canvas-confetti';

export interface AwardCatalogItem {
    id: string;
    title: string;
    description: string;
    category: 'medal' | 'cup' | 'certificate';
    iconUrl: string;
    rewardCoins: number;
    rewardXp: number;
    createdAt?: any;
}

export const AdminAwardsManager: React.FC = () => {
    const { user, userProfile } = useAuth();

    // 1. Catalog Awards State
    const [awards, setAwards] = useState<AwardCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 2. Create / Edit Award Form State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'medal' as 'medal' | 'cup' | 'certificate',
        iconUrl: '/banner-assets/icon-3d-trophy.png',
        rewardCoins: 30,
        rewardXp: 50
    });

    // 3. Manual Award Issuance State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedAward, setSelectedAward] = useState<AwardCatalogItem | null>(null);
    const [assignTargetType, setAssignTargetType] = useState<'student' | 'group'>('student');

    // Users and Groups list
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [allGroups, setAllGroups] = useState<string[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedGroupName, setSelectedGroupName] = useState('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

    // Subscribe to awards_catalog
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'awards_catalog'), (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AwardCatalogItem));
            setAwards(list);
            setLoading(false);
        }, (err) => {
            console.warn('[AdminAwardsManager] Snapshot error:', err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Load Students & Groups
    useEffect(() => {
        const loadUsersAndGroups = async () => {
            try {
                const snap = await getDocs(collection(db, 'users'));
                const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllStudents(usersList);

                // Collect unique group names
                const groupsSet = new Set<string>();
                usersList.forEach((u: any) => {
                    const g = u.group || u.groupName || u.trainingGroup;
                    if (g && typeof g === 'string') groupsSet.add(g.trim());
                });

                // Also try from groups collection
                try {
                    const gSnap = await getDocs(collection(db, 'groups'));
                    gSnap.docs.forEach(d => {
                        const name = d.data().name;
                        if (name) groupsSet.add(name.trim());
                    });
                } catch {}

                setAllGroups(Array.from(groupsSet));
            } catch (err) {
                console.warn('[AdminAwardsManager] Load users error:', err);
            }
        };

        loadUsersAndGroups();
    }, []);

    // Preset Icons for quick selection
    const PRESET_ICONS = [
        { label: '🏆 Золотой Кубок', url: '/banner-assets/icon-3d-trophy.png' },
        { label: '🛡️ Спартанский Щит', url: '/banner-assets/icon-shield.png' },
        { label: '👟 Быстрая Бутса', url: '/banner-assets/icon-3d-sneaker.png' },
        { label: '⚡ Молния / Скорость', url: '/banner-assets/icon-3d-lightning.png' },
        { label: '🟡 Золотая Монета', url: '/banner-assets/icon-coin.png' }
    ];

    // Handle Create Award
    const handleSaveAward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Пожалуйста, введите название награды');
            return;
        }

        setIsSaving(true);
        try {
            const defaultIcon = formData.category === 'cup'
                ? '/assets/awards/3d/gold_cup.jpg'
                : formData.category === 'certificate'
                    ? '/assets/awards/3d/certificate.jpg'
                    : '/assets/awards/3d/gold_medal.jpg';

            await addDoc(collection(db, 'awards_catalog'), {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                iconUrl: formData.iconUrl || defaultIcon,
                rewardCoins: Number(formData.rewardCoins) || 0,
                rewardXp: Number(formData.rewardXp) || 0,
                canPinToProfile: true,
                createdAt: serverTimestamp()
            });

            setIsCreateModalOpen(false);
            setFormData({
                title: '',
                description: '',
                category: 'medal',
                iconUrl: '/assets/awards/3d/gold_medal.jpg',
                rewardCoins: 30,
                rewardXp: 50
            });
            confetti({ particleCount: 40, spread: 50 });
        } catch (err) {
            console.error('Error saving award:', err);
            alert('Ошибка при сохранении награды');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Delete Award
    const handleDeleteAward = async (awardId: string, title: string) => {
        if (!window.confirm(`Удалить награду «${title}» из каталога?`)) return;
        try {
            await deleteDoc(doc(db, 'awards_catalog', awardId));
        } catch (err) {
            console.error('Error deleting award:', err);
            alert('Ошибка при удалении');
        }
    };

    // Open Manual Assign Modal
    const handleOpenAssignModal = (award: AwardCatalogItem) => {
        setSelectedAward(award);
        setSelectedStudentId('');
        setSelectedGroupName(allGroups[0] || '');
        setStudentSearchQuery('');
        setAssignSuccessMessage(null);
        setIsAssignModalOpen(true);
    };

    // Execute Manual Award Issuance
    const handleExecuteAssign = async () => {
        if (!selectedAward) return;

        setIsAssigning(true);
        const coachName = userProfile?.displayName || userProfile?.name || 'Тренер SPARTA';

        try {
            let targetStudentIds: string[] = [];

            if (assignTargetType === 'student') {
                if (!selectedStudentId) {
                    alert('Пожалуйста, выберите ученика');
                    setIsAssigning(false);
                    return;
                }
                targetStudentIds = [selectedStudentId];
            } else {
                if (!selectedGroupName) {
                    alert('Пожалуйста, выберите группу');
                    setIsAssigning(false);
                    return;
                }
                targetStudentIds = allStudents
                    .filter((u: any) => (u.group || u.groupName || u.trainingGroup) === selectedGroupName)
                    .map(u => u.id);

                if (targetStudentIds.length === 0) {
                    alert('В выбранной группе не найдено учеников');
                    setIsAssigning(false);
                    return;
                }
            }

            // Award each target student
            for (const sId of targetStudentIds) {
                // 1. Add to user_achievements subcollection
                await addDoc(collection(db, 'users', sId, 'user_achievements'), {
                    awardId: selectedAward.id,
                    title: selectedAward.title,
                    description: selectedAward.description,
                    category: selectedAward.category,
                    iconUrl: selectedAward.iconUrl || '',
                    rewardCoins: Number(selectedAward.rewardCoins) || 0,
                    rewardXp: Number(selectedAward.rewardXp) || 0,
                    awardedAt: serverTimestamp(),
                    awardedBy: coachName
                });

                // 2. Update user document balance & achievements array
                await updateDoc(doc(db, 'users', sId), {
                    coins: increment(Number(selectedAward.rewardCoins) || 0),
                    xp: increment(Number(selectedAward.rewardXp) || 0),
                    achievements: arrayUnion({
                        id: selectedAward.id,
                        awardId: selectedAward.id,
                        title: selectedAward.title,
                        description: selectedAward.description,
                        unlockedAt: Date.now()
                    })
                });
            }

            confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
            setAssignSuccessMessage(
                assignTargetType === 'student'
                    ? `Награда «${selectedAward.title}» успешно вручена ученику!`
                    : `Награда «${selectedAward.title}» вручена всей группе (${targetStudentIds.length} уч.)!`
            );

            setTimeout(() => {
                setIsAssignModalOpen(false);
                setAssignSuccessMessage(null);
            }, 1800);
        } catch (err) {
            console.error('Error assigning award:', err);
            alert('Ошибка при выдаче награды');
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredAwards = awards.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStudents = allStudents.filter((s: any) => {
        const name = `${s.childName || ''} ${s.childFirstName || ''} ${s.childLastName || ''} ${s.displayName || ''}`.toLowerCase();
        return name.includes(studentSearchQuery.toLowerCase());
    });

    return (
        <div className="w-full space-y-6 text-white">
            {/* Header */}
            <div className="p-6 rounded-3xl bg-[#121215] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-russo uppercase tracking-wide text-white flex items-center gap-2.5">
                        <Trophy className="text-sparta-gold" size={26} />
                        <span>Каталог наград & Ручная выдача</span>
                    </h2>
                    <p className="text-xs text-white/50">
                        Создавайте новые медали, кубки и дипломы в `awards_catalog` и вручайте их ученикам или целым группам
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2.5 bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-sparta-gold/20 font-black cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Создать награду</span>
                    </button>
                </div>
            </div>

            {/* Search Filter */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по каталогу наград..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/50"
                />
            </div>

            {/* Awards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAwards.map((award) => (
                    <div
                        key={award.id}
                        className="p-4 rounded-3xl bg-zinc-900/90 border border-white/10 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all shadow-md relative group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-russo uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-300">
                                {award.category === 'medal' ? '🏅 Медаль' : award.category === 'cup' ? '🏆 Кубок' : '📜 Грамота'}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleDeleteAward(award.id, award.title)}
                                className="text-white/30 hover:text-red-400 transition-colors p-1"
                                title="Удалить награду"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Center Icon */}
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                {award.iconUrl ? (
                                    <img src={award.iconUrl} alt={award.title} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-2xl">
                                        {award.category === 'cup' ? '🏆' : award.category === 'certificate' ? '📜' : '🏅'}
                                    </span>
                                )}
                            </div>
                            <div className="text-center space-y-0.5">
                                <h4 className="font-bold text-sm text-white line-clamp-1">{award.title}</h4>
                                <p className="text-[11px] text-white/50 line-clamp-2">{award.description}</p>
                            </div>
                        </div>

                        {/* Footer: Rewards & Assign Button */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300 font-russo">
                                <SpartaCoinIcon size={12} />
                                <span>+{award.rewardCoins}</span>
                                <span className="text-white/30">•</span>
                                <span className="text-emerald-400">+{award.rewardXp} XP</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenAssignModal(award)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-russo text-[10px] uppercase tracking-wider transition-all font-bold cursor-pointer"
                            >
                                Выдать →
                            </button>
                        </div>
                    </div>
                ))}

                {filteredAwards.length === 0 && !loading && (
                    <div className="col-span-full p-8 rounded-3xl bg-white/5 border border-white/10 text-center space-y-2">
                        <Trophy size={32} className="mx-auto text-white/30" />
                        <p className="text-sm font-russo text-white/70">В каталоге пока нет созданных наград</p>
                        <p className="text-xs text-white/40">Нажмите «Создать награду», чтобы добавить первую награду в `awards_catalog`</p>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* МОДАЛКА 1: СОЗДАНИЕ НАГРАДЫ В awards_catalog */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl">
                        <div className="absolute inset-0" onClick={() => setIsCreateModalOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative max-w-lg w-full bg-[#141417] border border-sparta-gold/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl z-10"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-sparta-gold" />
                                    <h3 className="font-russo text-lg uppercase text-white tracking-wide">
                                        Создание новой награды
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-1.5 text-white/40 hover:text-white rounded-lg cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveAward} className="space-y-4">
                                {/* Название */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Название награды *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Например: Первый хет-трик турнира"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                </div>

                                {/* Описание */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Критерий / Описание
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="За какие спортивные заслуги присуждается награда"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
                                    />
                                </div>

                                {/* Тип награды (Медаль / Кубок / Грамота) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Тип награды
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['medal', 'cup', 'certificate'] as const).map(cat => (
                                            <button
                                                type="button"
                                                key={cat}
                                                onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                                                className={`py-2 px-3 rounded-xl text-xs font-russo uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                    formData.category === cat
                                                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                                                        : 'bg-zinc-900 text-white/60 border-white/10 hover:bg-zinc-800'
                                                }`}
                                            >
                                                <span>{cat === 'medal' ? '🏅' : cat === 'cup' ? '🏆' : '📜'}</span>
                                                <span>{cat === 'medal' ? 'Медаль' : cat === 'cup' ? 'Кубок' : 'Грамота'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Выбор иконки / ссылка */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Иконка (SVG / PNG ассет)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {PRESET_ICONS.map(pi => (
                                            <button
                                                type="button"
                                                key={pi.url}
                                                onClick={() => setFormData(prev => ({ ...prev, iconUrl: pi.url }))}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                                    formData.iconUrl === pi.url
                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                                        : 'bg-white/5 text-white/50 hover:text-white border-white/10'
                                                }`}
                                            >
                                                <span>{pi.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.iconUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, iconUrl: e.target.value }))}
                                        placeholder="Ссылка на PNG или SVG ассет"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                </div>

                                {/* Награда: Монеты и XP */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                            Награда (Монеты)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.rewardCoins}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rewardCoins: Number(e.target.value) }))}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                            Награда (XP)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.rewardXp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rewardXp: Number(e.target.value) }))}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-3 bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase tracking-wider rounded-xl transition-all font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sparta-gold/20"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    <span>Сохранить награду в каталог</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================================= */}
            {/* МОДАЛКА 2: РУЧНАЯ ВЫДАЧА НАГРАДЫ УЧЕНИКУ ИЛИ ВСЕЙ ГРУППЕ */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {isAssignModalOpen && selectedAward && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl">
                        <div className="absolute inset-0" onClick={() => setIsAssignModalOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative max-w-md w-full bg-[#141417] border border-sparta-gold/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl z-10"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award size={20} className="text-sparta-gold" />
                                    <h3 className="font-russo text-lg uppercase text-white tracking-wide">
                                        Выдать награду
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="p-1.5 text-white/40 hover:text-white rounded-lg cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Award Info Preview */}
                            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                                    {selectedAward.iconUrl ? (
                                        <img src={selectedAward.iconUrl} alt={selectedAward.title} className="w-8 h-8 object-contain" />
                                    ) : (
                                        <span>🏆</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white">{selectedAward.title}</h4>
                                    <p className="text-[11px] text-amber-300 font-russo flex items-center gap-1">
                                        <span>+{selectedAward.rewardCoins} монет</span>
                                        <span>•</span>
                                        <span className="text-emerald-400">+{selectedAward.rewardXp} XP</span>
                                    </p>
                                </div>
                            </div>

                            {/* Target Type Selector: Конкретному ученику ИЛИ Всей группе */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignTargetType('student')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-russo uppercase tracking-wider border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        assignTargetType === 'student'
                                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                                            : 'bg-zinc-900 text-white/60 border-white/10 hover:bg-zinc-800'
                                    }`}
                                >
                                    <User size={14} />
                                    <span>Ученику</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAssignTargetType('group')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-russo uppercase tracking-wider border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        assignTargetType === 'group'
                                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                                            : 'bg-zinc-900 text-white/60 border-white/10 hover:bg-zinc-800'
                                    }`}
                                >
                                    <Users size={14} />
                                    <span>Всей группе</span>
                                </button>
                            </div>

                            {/* Student Search & Picker */}
                            {assignTargetType === 'student' ? (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Выберите ученика
                                    </label>
                                    <input
                                        type="text"
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        placeholder="Поиск ученика по имени..."
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                        {filteredStudents.slice(0, 10).map((s: any) => {
                                            const sName = s.childName || `${s.childFirstName || ''} ${s.childLastName || ''}`.trim() || s.displayName || s.email;
                                            const isSelected = selectedStudentId === s.id;

                                            return (
                                                <button
                                                    type="button"
                                                    key={s.id}
                                                    onClick={() => setSelectedStudentId(s.id)}
                                                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer border ${
                                                        isSelected
                                                            ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                                            : 'bg-zinc-900/60 text-white/70 border-white/5 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span className="font-bold">{sName}</span>
                                                    {s.group && <span className="text-[10px] text-white/40">{s.group}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Group Selector */
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                                        Выберите группу
                                    </label>
                                    <select
                                        value={selectedGroupName}
                                        onChange={(e) => setSelectedGroupName(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    >
                                        {allGroups.map(g => (
                                            <option key={g} value={g} className="bg-zinc-900 text-white">
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-white/50">
                                        Награда и бонусы будут начислены каждому спортсмену этой группы
                                    </p>
                                </div>
                            )}

                            {assignSuccessMessage && (
                                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    <span>{assignSuccessMessage}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleExecuteAssign}
                                disabled={isAssigning}
                                className="w-full py-3 bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase tracking-wider rounded-xl transition-all font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sparta-gold/20"
                            >
                                {isAssigning ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                                <span>Вручить награду (+{selectedAward.rewardCoins} монет)</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminAwardsManager;
