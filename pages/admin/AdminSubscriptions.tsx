import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Edit2, Trash2, Check, X, Search, Filter,
    Sparkles, RefreshCw, Layers, ShieldCheck, MapPin, Users,
    Clock, DollarSign, Flame, Eye, EyeOff, Copy, ArrowUpDown
} from 'lucide-react';
import { SubscriptionPlan, AgeCategory, SubscriptionType } from '../../types/subscription';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../../constants/spartaSubscriptions';
import { CITIES, SPARTA_LOCATIONS } from '../../constants/cities';
import { db } from '../../firebase';
import {
    collection, onSnapshot, doc, setDoc, updateDoc,
    deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore';

export const AdminSubscriptions: React.FC = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSeeding, setIsSeeding] = useState<boolean>(false);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedAge, setSelectedAge] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Feature input helper in modal
    const [newFeatureText, setNewFeatureText] = useState<string>('');

    // Real-time listener for subscription_plans
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'subscription_plans'), (snapshot) => {
            if (!snapshot.empty) {
                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SubscriptionPlan[];
                setPlans(fetched);
            } else {
                setPlans(DEFAULT_SUBSCRIPTION_PLANS as SubscriptionPlan[]);
            }
            setLoading(false);
        }, (err) => {
            console.error('Error fetching plans:', err);
            setPlans(DEFAULT_SUBSCRIPTION_PLANS as SubscriptionPlan[]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Seed preset plans to Firestore
    const handleSeedDefaultPlans = async () => {
        if (!window.confirm('Инициализировать базу стандартных тарифов для Челябинска и Новосибирска?')) return;
        setIsSeeding(true);
        try {
            let count = 0;
            for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
                const ref = doc(db, 'subscription_plans', plan.id);
                await setDoc(ref, {
                    ...plan,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }, { merge: true });
                count++;
            }
            alert(`Успешно обновлено и загружено ${count} тарифов!`);
        } catch (e: any) {
            console.error('Seed error:', e);
            alert('Ошибка при сохранении: ' + e.message);
        } finally {
            setIsSeeding(false);
        }
    };

    // Filtered plans
    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = (p.title || '').toLowerCase().includes(q);
                const matchDesc = (p.description || '').toLowerCase().includes(q);
                const matchBadge = (p.badge || '').toLowerCase().includes(q);
                const matchBranch = (p.branchName || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchBadge && !matchBranch) return false;
            }

            // City
            if (selectedCity !== 'all') {
                if (p.cityId !== selectedCity && p.cityId !== 'all' && !p.isUniversal) return false;
            }

            // Branch
            if (selectedBranch !== 'all') {
                const matchBranch = p.branchId === selectedBranch ||
                    p.branchId === 'all' ||
                    (Array.isArray(p.branchIds) && p.branchIds.includes(selectedBranch)) ||
                    p.isUniversal;
                if (!matchBranch) return false;
            }

            // Age
            if (selectedAge !== 'all') {
                if (p.ageCategory !== selectedAge && p.ageCategory !== 'ALL') return false;
            }

            // Status
            if (statusFilter === 'active' && p.isActive === false) return false;
            if (statusFilter === 'archived' && p.isActive !== false) return false;

            return true;
        }).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99) || a.price - b.price);
    }, [plans, searchQuery, selectedCity, selectedBranch, selectedAge, statusFilter]);

    // Quick toggle active status
    const handleToggleActive = async (plan: SubscriptionPlan) => {
        try {
            const ref = doc(db, 'subscription_plans', plan.id);
            await updateDoc(ref, {
                isActive: plan.isActive === false ? true : false,
                updatedAt: serverTimestamp()
            });
        } catch (e: any) {
            console.error('Toggle error:', e);
            alert('Ошибка изменения статуса: ' + e.message);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan({ ...plan });
        } else {
            setEditingPlan({
                id: `plan_${Date.now()}`,
                title: '',
                description: '',
                cityId: selectedCity !== 'all' ? selectedCity : 'chelyabinsk',
                cityName: selectedCity === 'novosibirsk' ? 'Новосибирск' : 'Челябинск',
                branchId: selectedBranch !== 'all' ? selectedBranch : 'newton',
                branchName: 'ОЦ «Ньютон»',
                isUniversal: false,
                ageCategory: 'JUNIOR_3_6',
                ageLabel: '3–6 лет',
                scheduleSlots: ['18:00 - 19:00'],
                scheduleDays: 'Пн, Ср, Пт',
                type: 'sessions',
                totalSessions: 8,
                validityDays: 30,
                price: 5200,
                oldPrice: 6000,
                perSessionPrice: 650,
                isActive: true,
                isPopular: false,
                badge: '',
                features: [
                    '8 тренировок в месяц (2 раза в неделю)',
                    '100% заморозка при болезни по справке',
                    'Дневник юного чемпиона'
                ],
                sortOrder: (plans.length || 0) + 1
            });
        }
        setNewFeatureText('');
        setIsModalOpen(true);
    };

    // Duplicate Plan
    const handleDuplicatePlan = async (plan: SubscriptionPlan) => {
        const newId = `plan_${Date.now()}`;
        const newPlan: SubscriptionPlan = {
            ...plan,
            id: newId,
            title: `${plan.title} (Копия)`,
            sortOrder: (plan.sortOrder || 0) + 1
        };
        try {
            await setDoc(doc(db, 'subscription_plans', newId), {
                ...newPlan,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (e: any) {
            alert('Ошибка дублирования: ' + e.message);
        }
    };

    // Delete Plan
    const handleDeletePlan = async (planId: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот тариф?')) return;
        try {
            await deleteDoc(doc(db, 'subscription_plans', planId));
        } catch (e: any) {
            alert('Ошибка удаления: ' + e.message);
        }
    };

    // Save Modal Plan
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan || !editingPlan.title || !editingPlan.price) {
            alert('Пожалуйста, заполните название и цену тарифа');
            return;
        }

        setIsSaving(true);
        try {
            const planId = editingPlan.id || `plan_${Date.now()}`;
            const matchedBranch = SPARTA_LOCATIONS.find(l => l.id === editingPlan.branchId);
            const matchedCity = CITIES.find(c => c.id === editingPlan.cityId);

            const calculatedPerSession = editingPlan.totalSessions
                ? Math.round(Number(editingPlan.price) / Number(editingPlan.totalSessions))
                : null;

            const payload: any = {
                ...editingPlan,
                id: planId,
                cityName: matchedCity?.name || (editingPlan.cityId === 'novosibirsk' ? 'Новосибирск' : 'Челябинск'),
                branchName: editingPlan.isUniversal ? 'Все филиалы города' : (matchedBranch?.name || editingPlan.branchName || 'Филиал Sparta'),
                perSessionPrice: editingPlan.perSessionPrice || calculatedPerSession,
                price: Number(editingPlan.price),
                oldPrice: editingPlan.oldPrice ? Number(editingPlan.oldPrice) : null,
                totalSessions: editingPlan.totalSessions ? Number(editingPlan.totalSessions) : null,
                validityDays: Number(editingPlan.validityDays) || 30,
                sortOrder: Number(editingPlan.sortOrder) || 1,
                isActive: editingPlan.isActive !== false,
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'subscription_plans', planId), payload, { merge: true });
            setIsModalOpen(false);
            setEditingPlan(null);
        } catch (e: any) {
            console.error('Save plan error:', e);
            alert('Ошибка сохранения тарифа: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Stats
    const stats = useMemo(() => {
        const total = plans.length;
        const active = plans.filter(p => p.isActive !== false).length;
        const chel = plans.filter(p => p.cityId === 'chelyabinsk').length;
        const nsk = plans.filter(p => p.cityId === 'novosibirsk').length;
        const avgPrice = total > 0 ? Math.round(plans.reduce((acc, p) => acc + (p.price || 0), 0) / total) : 0;
        return { total, active, chel, nsk, avgPrice };
    }, [plans]);

    return (
        <div className="space-y-8 font-manrope text-white pb-16">
            {/* Top Title & Actions Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 rounded-xl bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20">
                            <CreditCard size={20} />
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-russo uppercase tracking-wider">
                            Управление тарифами и абонементами
                        </h1>
                    </div>
                    <p className="text-sm text-white/50">
                        Настройка стоимости, сегментации по филиалам (Челябинск / Новосибирск), возрастам и вечерним слотам.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSeedDefaultPlans}
                        disabled={isSeeding}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 hover:text-white flex items-center gap-2 transition-all"
                        title="Восстановить базовый набор тарифов"
                    >
                        <RefreshCw size={14} className={isSeeding ? 'animate-spin' : ''} />
                        <span>Базовые тарифы</span>
                    </button>

                    <button
                        onClick={() => handleOpenEdit()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 text-black text-xs font-russo uppercase tracking-wider flex items-center gap-2 hover:brightness-110 shadow-lg shadow-sparta-gold/20 transition-all font-black"
                    >
                        <Plus size={16} />
                        <span>Добавить тариф</span>
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-xl">
                    <div className="text-xs text-white/40 uppercase font-bold mb-1">Всего планов</div>
                    <div className="text-2xl font-russo text-white">{stats.total}</div>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-xl">
                    <div className="text-xs text-emerald-400/80 uppercase font-bold mb-1">На витрине</div>
                    <div className="text-2xl font-russo text-emerald-400">{stats.active}</div>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-xl">
                    <div className="text-xs text-amber-400/80 uppercase font-bold mb-1">Челябинск</div>
                    <div className="text-2xl font-russo text-amber-300">{stats.chel}</div>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-xl">
                    <div className="text-xs text-sky-400/80 uppercase font-bold mb-1">Новосибирск</div>
                    <div className="text-2xl font-russo text-sky-300">{stats.nsk}</div>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 backdrop-blur-xl col-span-2 sm:col-span-1">
                    <div className="text-xs text-sparta-gold/80 uppercase font-bold mb-1">Средний чек</div>
                    <div className="text-2xl font-russo text-sparta-gold">{stats.avgPrice.toLocaleString('ru-RU')} ₽</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative col-span-1 sm:col-span-2">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по названию, залу или бейджу..."
                            className="w-full h-10 pl-10 pr-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:border-sparta-gold focus:outline-none"
                        />
                    </div>

                    {/* City */}
                    <div>
                        <select
                            value={selectedCity}
                            onChange={(e) => {
                                setSelectedCity(e.target.value);
                                setSelectedBranch('all');
                            }}
                            className="w-full h-10 px-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:border-sparta-gold focus:outline-none"
                        >
                            <option value="all">Все города</option>
                            {CITIES.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch */}
                    <div>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full h-10 px-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:border-sparta-gold focus:outline-none"
                        >
                            <option value="all">Все залы</option>
                            {SPARTA_LOCATIONS
                                .filter(l => selectedCity === 'all' || l.cityId === selectedCity)
                                .map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full h-10 px-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:border-sparta-gold focus:outline-none"
                        >
                            <option value="all">Все статусы</option>
                            <option value="active">Только активные</option>
                            <option value="archived">В архиве</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Plans List Table */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-white/10 bg-black/40 text-white/40 uppercase font-bold text-[10px] tracking-wider">
                                <th className="py-3.5 px-4">Тариф</th>
                                <th className="py-3.5 px-4">Город и Зал</th>
                                <th className="py-3.5 px-4">Возраст</th>
                                <th className="py-3.5 px-4">Расписание</th>
                                <th className="py-3.5 px-4">Занятия</th>
                                <th className="py-3.5 px-4">Стоимость</th>
                                <th className="py-3.5 px-4 text-center">Витрина</th>
                                <th className="py-3.5 px-4 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/80">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-white/40">
                                        Загрузка тарифов...
                                    </td>
                                </tr>
                            ) : filteredPlans.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-white/40">
                                        Тарифы не найдены. Создайте новый или сбросьте фильтры.
                                    </td>
                                </tr>
                            ) : (
                                filteredPlans.map(plan => {
                                    const perSession = plan.perSessionPrice || (plan.totalSessions ? Math.round(plan.price / plan.totalSessions) : null);
                                    const isActive = plan.isActive !== false;

                                    return (
                                        <tr key={plan.id} className={`hover:bg-white/5 transition-colors ${!isActive ? 'opacity-50 bg-black/20' : ''}`}>
                                            {/* Title & Badge */}
                                            <td className="py-3.5 px-4 font-medium text-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{plan.title}</span>
                                                    {plan.badge && (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sparta-gold text-black">
                                                            {plan.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {plan.description && (
                                                    <div className="text-[10px] text-white/40 truncate max-w-xs mt-0.5">
                                                        {plan.description}
                                                    </div>
                                                )}
                                            </td>

                                            {/* City & Branch */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1 font-bold text-white/90">
                                                    <MapPin size={12} className="text-sparta-gold shrink-0" />
                                                    <span>{plan.branchName || plan.branchId}</span>
                                                </div>
                                                <div className="text-[10px] text-white/40">
                                                    {plan.cityName || (plan.cityId === 'novosibirsk' ? 'Новосибирск' : 'Челябинск')}
                                                    {plan.isUniversal && ' • Мульти'}
                                                </div>
                                            </td>

                                            {/* Age */}
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                                    plan.ageCategory === 'JUNIOR_3_6'
                                                        ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                                                        : plan.ageCategory === 'SENIOR_7_14'
                                                        ? 'bg-sky-400/10 text-sky-300 border-sky-400/20'
                                                        : 'bg-white/5 text-white/70 border-white/10'
                                                }`}>
                                                    {plan.ageLabel || (plan.ageCategory === 'JUNIOR_3_6' ? '3–6 лет' : plan.ageCategory === 'SENIOR_7_14' ? '7–14 лет' : 'Все возрасты')}
                                                </span>
                                            </td>

                                            {/* Schedule */}
                                            <td className="py-3.5 px-4 text-[11px]">
                                                <div className="text-white font-medium">{plan.scheduleDays || 'Пн, Ср, Пт'}</div>
                                                <div className="text-[10px] text-amber-300">
                                                    {plan.scheduleSlots?.join(', ') || '18:00 - 19:00'}
                                                </div>
                                            </td>

                                            {/* Sessions */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-bold text-white">
                                                    {plan.totalSessions ? `${plan.totalSessions} зан.` : 'Безлимит'}
                                                </span>
                                                <div className="text-[10px] text-white/40">{plan.validityDays} дн.</div>
                                            </td>

                                            {/* Price */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-sm text-white font-mono">
                                                    {plan.price.toLocaleString('ru-RU')} ₽
                                                </div>
                                                {perSession && (
                                                    <div className="text-[10px] text-white/40">
                                                        {perSession} ₽ / зан.
                                                    </div>
                                                )}
                                            </td>

                                            {/* Active Toggle */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(plan)}
                                                    className={`p-1.5 rounded-lg border transition-all ${
                                                        isActive
                                                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                                                            : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                                                    }`}
                                                    title={isActive ? 'Скрыть с витрины' : 'Показать на витрине'}
                                                >
                                                    {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleDuplicatePlan(plan)}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                                        title="Дублировать тариф"
                                                    >
                                                        <Copy size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(plan)}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                                        title="Редактировать"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlan(plan.id)}
                                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Plan Modal */}
            <AnimatePresence>
                {isModalOpen && editingPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 my-auto text-white space-y-6 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-russo uppercase tracking-wider">
                                        {editingPlan.id?.startsWith('plan_') ? 'Новый тариф' : `Редактирование: ${editingPlan.title}`}
                                    </h3>
                                    <p className="text-xs text-white/40">Настройте параметры абонемента и условия посещений</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
                                {/* Title & Badge */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-white/60 font-bold uppercase mb-1">Название абонемента *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingPlan.title || ''}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })}
                                            placeholder="например: Стандарт (8 занятий)"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Бейдж / Метка</label>
                                        <input
                                            type="text"
                                            value={editingPlan.badge || ''}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                                            placeholder="Хит • Ньютон"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-white/60 font-bold uppercase mb-1">Описание тарифа</label>
                                    <textarea
                                        rows={2}
                                        value={editingPlan.description || ''}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                        placeholder="Для кого подходит, какие задачи решает..."
                                        className="w-full p-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                    />
                                </div>

                                {/* City, Branch & Universal */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Город</label>
                                        <select
                                            value={editingPlan.cityId || 'chelyabinsk'}
                                            onChange={(e) => {
                                                const cId = e.target.value;
                                                setEditingPlan({
                                                    ...editingPlan,
                                                    cityId: cId,
                                                    cityName: cId === 'novosibirsk' ? 'Новосибирск' : 'Челябинск'
                                                });
                                            }}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        >
                                            {CITIES.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Филиал / Зал</label>
                                        <select
                                            value={editingPlan.branchId || 'newton'}
                                            onChange={(e) => {
                                                const bId = e.target.value;
                                                const loc = SPARTA_LOCATIONS.find(l => l.id === bId);
                                                setEditingPlan({
                                                    ...editingPlan,
                                                    branchId: bId,
                                                    branchName: loc?.name || bId
                                                });
                                            }}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        >
                                            <option value="all">Все залы города</option>
                                            {SPARTA_LOCATIONS
                                                .filter(l => editingPlan.cityId === 'all' || l.cityId === editingPlan.cityId)
                                                .map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingPlan.isUniversal)}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, isUniversal: e.target.checked })}
                                                className="rounded border-white/20 text-sparta-gold focus:ring-sparta-gold w-4 h-4"
                                            />
                                            <span className="text-white/80 font-bold">Мульти-абонемент (все залы)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Age & Slots */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Возрастная категория</label>
                                        <select
                                            value={editingPlan.ageCategory || 'JUNIOR_3_6'}
                                            onChange={(e) => {
                                                const val = e.target.value as AgeCategory;
                                                setEditingPlan({
                                                    ...editingPlan,
                                                    ageCategory: val,
                                                    ageLabel: val === 'JUNIOR_3_6' ? '3–6 лет' : val === 'SENIOR_7_14' ? '7–14 лет' : 'Все возрасты'
                                                });
                                            }}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        >
                                            <option value="JUNIOR_3_6">3–6 лет (Junior)</option>
                                            <option value="SENIOR_7_14">7–14 лет (Senior)</option>
                                            <option value="ALL">Все возрасты (Универсал)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Дни недели</label>
                                        <input
                                            type="text"
                                            value={editingPlan.scheduleDays || ''}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, scheduleDays: e.target.value })}
                                            placeholder="Пн, Ср, Пт"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Временные слоты</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(editingPlan.scheduleSlots) ? editingPlan.scheduleSlots.join(', ') : ''}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                scheduleSlots: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                            })}
                                            placeholder="18:00 - 19:00, 19:00 - 20:00"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Type, Sessions & Validity */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Тип тарифа</label>
                                        <select
                                            value={editingPlan.type || 'sessions'}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, type: e.target.value as SubscriptionType })}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        >
                                            <option value="sessions">Пакет занятий</option>
                                            <option value="monthly">Безлимит на месяц</option>
                                            <option value="single">Разовое</option>
                                            <option value="trial">Пробное</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Кол-во занятий</label>
                                        <input
                                            type="number"
                                            value={editingPlan.totalSessions ?? ''}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                totalSessions: e.target.value ? Number(e.target.value) : null
                                            })}
                                            placeholder="8 (или пусто для безлимита)"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Срок (дней)</label>
                                        <input
                                            type="number"
                                            value={editingPlan.validityDays || 30}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, validityDays: Number(e.target.value) })}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/60 font-bold uppercase mb-1">Порядок сортировки</label>
                                        <input
                                            type="number"
                                            value={editingPlan.sortOrder || 1}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, sortOrder: Number(e.target.value) })}
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Price & Old Price */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-black/40 border border-white/5 rounded-2xl">
                                    <div>
                                        <label className="block text-sparta-gold font-bold uppercase mb-1">Стоимость (₽) *</label>
                                        <input
                                            type="number"
                                            required
                                            value={editingPlan.price || ''}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                                            placeholder="5200"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-sparta-gold/30 rounded-xl text-white focus:border-sparta-gold focus:outline-none font-mono text-sm font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/40 font-bold uppercase mb-1">Старая цена (₽ для зачеркивания)</label>
                                        <input
                                            type="number"
                                            value={editingPlan.oldPrice || ''}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, oldPrice: e.target.value ? Number(e.target.value) : null })}
                                            placeholder="6000"
                                            className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Features List Builder */}
                                <div>
                                    <label className="block text-white/60 font-bold uppercase mb-1.5">Преимущества (галочки на карточке)</label>
                                    <div className="space-y-1.5 mb-2">
                                        {(editingPlan.features || []).map((feat, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 text-xs">
                                                <span className="text-white/90">✓ {feat}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = (editingPlan.features || []).filter((_, i) => i !== idx);
                                                        setEditingPlan({ ...editingPlan, features: updated });
                                                    }}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newFeatureText}
                                            onChange={(e) => setNewFeatureText(e.target.value)}
                                            placeholder="Добавить преимущество..."
                                            className="flex-1 h-9 px-3 bg-zinc-900 border border-white/10 rounded-xl text-white focus:border-sparta-gold focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!newFeatureText.trim()) return;
                                                setEditingPlan({
                                                    ...editingPlan,
                                                    features: [...(editingPlan.features || []), newFeatureText.trim()]
                                                });
                                                setNewFeatureText('');
                                            }}
                                            className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold"
                                        >
                                            + Добавить
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-russo uppercase tracking-wider hover:brightness-110 font-black shadow-lg shadow-sparta-gold/20"
                                    >
                                        {isSaving ? 'Сохранение...' : 'Сохранить тариф'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminSubscriptions;