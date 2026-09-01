import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserCheck, Flame, Trophy, CreditCard, RefreshCw,
    Search, CheckCircle2, ChevronRight, Zap, Smartphone,
    QrCode, MessageSquare, Phone, Plus, Gift, ArrowRight,
    ExternalLink, Sparkles, LogOut, Check, Building, ShieldCheck,
    Wallet, TrendingUp, HelpCircle, X, Calendar, Clock, ArrowUpRight,
    Receipt, Tag, ShoppingBag, Award, Eye
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection, query, limit, getDocs, doc, updateDoc,
    where, orderBy, onSnapshot
} from 'firebase/firestore';

interface DeveloperConsoleProps {
    currentUser: any;
    currentUserProfile: any;
    onImpersonateRole?: (role: string | null, targetTab?: string) => void;
    currentImpersonatedRole?: string | null;
    onOpenScanner?: () => void;
    onOpenMessages?: () => void;
    onOpenAdmin?: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
    currentUser,
    currentUserProfile,
    onImpersonateRole,
    currentImpersonatedRole,
    onOpenScanner,
    onOpenMessages,
    onOpenAdmin
}) => {
    // Real Stats from Firestore
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [todayRevenue, setTodayRevenue] = useState<number>(0);
    const [monthRevenue, setMonthRevenue] = useState<number>(0);
    const [todayOrders, setTodayOrders] = useState<any[]>([]);

    // Interactive Modals
    const [activeModal, setActiveModal] = useState<'none' | 'revenue' | 'students' | 'requests' | 'receipt'>('none');
    const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null);

    // Modal Filters
    const [studentSportFilter, setStudentSportFilter] = useState<'all' | 'football' | 'tennis' | 'other'>('all');
    const [studentSearchModalQuery, setStudentSearchModalQuery] = useState('');
    const [ordersCategoryFilter, setOrdersCategoryFilter] = useState<'all' | 'subscription' | 'shop' | 'topup'>('all');

    // Search & Student Cards in Main Screen
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [coinFeedbackUserId, setCoinFeedbackUserId] = useState<string | null>(null);

    // Test Payment State
    const [testPaymentUrl, setTestPaymentUrl] = useState<string | null>(null);
    const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Load Live Stats from Firestore
    useEffect(() => {
        // 1. Students
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            const students = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => u.role !== 'admin' && u.role !== 'developer' && u.role !== 'director');
            setAllStudents(students);
        });

        // 2. Orders & Revenue
        const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            let todaySum = 0;
            let monthSum = 0;
            const ordersList: any[] = [];
            const todayList: any[] = [];

            snap.docs.forEach(d => {
                const data = d.data();
                const amount = Number(data.totalAmount || data.price || data.amount || 0);
                const isPaid = data.status === 'completed' || data.status === 'succeeded' || data.status === 'paid';
                
                const date = data.date?.toDate?.() || data.createdAt?.toDate?.() || new Date(data.date || data.createdAt || 0);
                const orderObj = { id: d.id, ...data, parsedDate: date, numAmount: amount };

                if (isPaid && amount > 0) {
                    if (date >= today) {
                        todaySum += amount;
                        todayList.push(orderObj);
                    }
                    if (date >= startOfMonth) {
                        monthSum += amount;
                    }
                }

                ordersList.push(orderObj);
            });

            // Sort recent
            ordersList.sort((a, b) => (b.parsedDate?.getTime?.() || 0) - (a.parsedDate?.getTime?.() || 0));
            todayList.sort((a, b) => (b.parsedDate?.getTime?.() || 0) - (a.parsedDate?.getTime?.() || 0));

            setAllOrders(ordersList);
            setTodayOrders(todayList);
            setTodayRevenue(todaySum);
            setMonthRevenue(monthSum);
        });

        // 3. Requests
        const unsubRequests = onSnapshot(collection(db, 'requests'), (snap) => {
            const reqs = snap.docs.map(d => {
                const data = d.data();
                const date = data.date?.toDate?.() || data.createdAt?.toDate?.() || new Date(data.date || data.createdAt || 0);
                return { id: d.id, ...data, parsedDate: date };
            });
            reqs.sort((a, b) => (b.parsedDate?.getTime?.() || 0) - (a.parsedDate?.getTime?.() || 0));
            setAllRequests(reqs);
        });

        return () => {
            unsubUsers();
            unsubOrders();
            unsubRequests();
        };
    }, []);

    // Pending requests
    const pendingRequests = useMemo(() => {
        return allRequests.filter(r => r.status === 'pending' || r.status === 'new' || !r.status);
    }, [allRequests]);

    // Live Student Search on Main Screen
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(() => {
            setIsSearching(true);
            const term = searchQuery.trim().toLowerCase();
            const filtered = allStudents.filter((u: any) => {
                const name = (u.childName || u.displayName || u.name || '').toLowerCase();
                const parent = (u.parentName || u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                const pin = (u.kidPin || '').toString();
                return name.includes(term) || parent.includes(term) || phone.includes(term) || pin.includes(term);
            });
            setSearchResults(filtered.slice(0, 8));
            setIsSearching(false);
        }, 200);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, allStudents]);

    // Filtered students for modal
    const filteredModalStudents = useMemo(() => {
        return allStudents.filter(u => {
            const matchesSport =
                studentSportFilter === 'all'
                    ? true
                    : studentSportFilter === 'football'
                    ? /футбол|football/i.test(u.sport || u.direction || u.groupName || '')
                    : studentSportFilter === 'tennis'
                    ? /теннис|tennis/i.test(u.sport || u.direction || u.groupName || '')
                    : true;

            const term = studentSearchModalQuery.trim().toLowerCase();
            const matchesSearch = !term ||
                (u.childName || '').toLowerCase().includes(term) ||
                (u.name || '').toLowerCase().includes(term) ||
                (u.phone || '').toLowerCase().includes(term) ||
                (u.email || '').toLowerCase().includes(term);

            return matchesSport && matchesSearch;
        });
    }, [allStudents, studentSportFilter, studentSearchModalQuery]);

    // Filtered orders for main section
    const filteredOrders = useMemo(() => {
        if (ordersCategoryFilter === 'all') return allOrders.slice(0, 8);
        return allOrders.filter(o => {
            if (ordersCategoryFilter === 'subscription') return o.type === 'subscription' || /абонемент/i.test(o.description || '');
            if (ordersCategoryFilter === 'shop') return o.type === 'shop' || o.items || /мерч|магазин/i.test(o.description || '');
            if (ordersCategoryFilter === 'topup') return o.type === 'topup' || /пополнение/i.test(o.description || '');
            return true;
        }).slice(0, 8);
    }, [allOrders, ordersCategoryFilter]);

    // Quick Add 50 coins in 1 click
    const handleQuickAddCoins = async (targetUserId: string, currentCoins: number = 0) => {
        try {
            const newBalance = Number(currentCoins || 0) + 50;
            await updateDoc(doc(db, 'users', targetUserId), {
                coins: newBalance
            });
            setCoinFeedbackUserId(targetUserId);
            triggerToast('Начислено +50 монет в подарок! 🪙');
            setTimeout(() => setCoinFeedbackUserId(null), 2500);
        } catch (e: any) {
            triggerToast(`Ошибка: ${e.message}`);
        }
    };

    // Quick Test Payment
    const handleGenerateTestPayment = async () => {
        setIsGeneratingPayment(true);
        try {
            const res = await fetch('/api/robokassa-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 100,
                    description: 'Тестовая проверка оплаты (100 ₽)',
                    userId: currentUser?.uid || 'sparta_owner',
                    type: 'test_payment',
                    email: currentUser?.email || 'admin@sparta.club',
                    successUrl: `${window.location.origin}/dashboard?payment=success&type=test`,
                    failUrl: `${window.location.origin}/dashboard?payment=failed&type=test`
                })
            });

            const data = await res.json();
            if (data.url) {
                setTestPaymentUrl(data.url);
                triggerToast('Ссылка на тестовую оплату создана!');
            } else {
                triggerToast(`Ошибка: ${data.error || 'Не удалось получить ссылку'}`);
            }
        } catch (e: any) {
            triggerToast(`Сетевая ошибка: ${e.message}`);
        } finally {
            setIsGeneratingPayment(false);
        }
    };

    // Role options with target tab routing
    const roleOptions = [
        { id: null, title: 'Центр управления', targetTab: 'analytics', subtitle: 'Текущий режим', icon: Sparkles, color: 'border-sparta-gold bg-sparta-gold/15 text-sparta-gold' },
        { id: 'parent', title: 'Родитель', targetTab: 'family', subtitle: 'Семья, баланс, абонементы', icon: Users, color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
        { id: 'user', title: 'Юный спортсмен', targetTab: 'requests', subtitle: 'Дневник, награды, уровень', icon: Flame, color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
        { id: 'coach', title: 'Тренер', targetTab: 'coaching', subtitle: 'Журнал групп и расписание', icon: Trophy, color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
        { id: 'director', title: 'Директор', targetTab: 'analytics', subtitle: 'Финансовые отчеты и графики', icon: Building, color: 'border-rose-500/40 bg-rose-500/10 text-rose-400' },
        { id: 'admin', title: 'Администратор', targetTab: 'requests', subtitle: 'Заявки, CRM и списки', icon: ShieldCheck, color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
    ];

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-6 pb-12">
            {/* Temporary Notification Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-16 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96 p-3.5 bg-[#121212] border border-sparta-gold/60 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white text-xs font-bold"
                    >
                        <div className="flex items-center gap-2.5">
                            <Sparkles size={16} className="text-sparta-gold animate-spin" />
                            <span>{toastMessage}</span>
                        </div>
                        <button onClick={() => setToastMessage(null)} className="text-white/40 hover:text-white">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="bg-gradient-to-r from-[#141414] via-[#111111] to-[#0c0c0c] border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-russo text-white uppercase tracking-wider">
                                Главная панель управления
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/40 rounded-full">
                                Sparta
                            </span>
                        </div>
                        <p className="text-white/50 text-xs md:text-sm mt-1">
                            Оперативная сводка, быстрые действия и поиск учеников
                        </p>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs shadow-inner">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-white/80 font-medium">Оплата и сайт работают штатно</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BLOCK 1: 📊 ГЛАВНЫЙ ПУЛЬС КЛУБА (Кликабельные карточки с открытием деталей) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {/* 1. Выручка за сегодня -> Кликабельно */}
                <button
                    onClick={() => setActiveModal('revenue')}
                    className="bg-[#0e0e0e] border border-white/10 hover:border-sparta-gold/50 hover:bg-white/[0.02] rounded-3xl p-4 md:p-5 transition-all text-left group relative overflow-hidden active:scale-[0.99] shadow-lg cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80 transition-colors">
                            Выручка за сегодня
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <div className="text-xl md:text-2xl font-russo text-white group-hover:text-sparta-gold transition-colors">
                        {todayRevenue.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-[11px] text-white/40 mt-1 flex items-center justify-between">
                        <span>За месяц: <strong className="text-sparta-gold">{monthRevenue.toLocaleString('ru-RU')} ₽</strong></span>
                        <span className="text-sparta-gold text-[10px] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Детали <ChevronRight size={12} />
                        </span>
                    </div>
                </button>

                {/* 2. Всего учеников -> Кликабельно */}
                <button
                    onClick={() => setActiveModal('students')}
                    className="bg-[#0e0e0e] border border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.02] rounded-3xl p-4 md:p-5 transition-all text-left group relative overflow-hidden active:scale-[0.99] shadow-lg cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80 transition-colors">
                            Всего учеников
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-xl md:text-2xl font-russo text-white group-hover:text-emerald-400 transition-colors">
                        {allStudents.length} <span className="text-xs font-manrope text-white/40 font-normal">детей</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center justify-between">
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Футбол, Теннис, ОФП</span>
                        <span className="text-[10px] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Список <ChevronRight size={12} />
                        </span>
                    </div>
                </button>

                {/* 3. Новые заявки -> Кликабельно */}
                <button
                    onClick={() => setActiveModal('requests')}
                    className="bg-[#0e0e0e] border border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.02] rounded-3xl p-4 md:p-5 transition-all text-left group relative overflow-hidden active:scale-[0.99] shadow-lg cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover:text-white/80 transition-colors">
                            Новые заявки
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="text-xl md:text-2xl font-russo text-white flex items-center gap-2">
                        <span className="group-hover:text-cyan-400 transition-colors">{pendingRequests.length}</span>
                        {pendingRequests.length > 0 && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase animate-pulse">
                                Ждут звонка
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-white/40 mt-1 flex items-center justify-between">
                        <span>Лиды на пробное занятие</span>
                        <span className="text-cyan-400 text-[10px] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Открыть <ChevronRight size={12} />
                        </span>
                    </div>
                </button>
            </div>

            {/* BLOCK 2: ⚡ БЫСТРЫЕ ДЕЙСТВИЯ */}
            <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-sparta-gold" />
                    <h3 className="font-russo text-sm md:text-base text-white uppercase tracking-wider">
                        Быстрые действия
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Кнопка 1: Проверка Robokassa */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-sparta-gold/40 transition-all flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <CreditCard size={14} className="text-sparta-gold" />
                                    Проверка Robokassa
                                </h4>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">100 ₽</span>
                            </div>
                            <p className="text-[11px] text-white/40">
                                Сформировать тестовую ссылку на оплату для проверки кассы.
                            </p>
                        </div>
                        <div>
                            <button
                                onClick={handleGenerateTestPayment}
                                disabled={isGeneratingPayment}
                                className="w-full py-2.5 px-3 rounded-xl bg-sparta-gold/20 hover:bg-sparta-gold/30 border border-sparta-gold/50 text-sparta-gold text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                                <CreditCard size={13} />
                                <span>{isGeneratingPayment ? 'Создание...' : 'Проверить оплату (100 ₽)'}</span>
                            </button>

                            {testPaymentUrl && (
                                <a
                                    href={testPaymentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 w-full py-2 px-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 hover:underline shadow-md"
                                >
                                    <span>Открыть страницу оплаты</span>
                                    <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Кнопка 2: QR-Сканер на входе */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3">
                        <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                                <QrCode size={14} className="text-emerald-400" />
                                QR-Сканер на входе
                            </h4>
                            <p className="text-[11px] text-white/40">
                                Отметить приход ребенка на тренировку по пропуску.
                            </p>
                        </div>
                        <a
                            href="/admin/scanner"
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                            <QrCode size={13} />
                            <span>Открыть сканер пропусков</span>
                        </a>
                    </div>

                    {/* Кнопка 3: Чат */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3">
                        <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                                <MessageSquare size={14} className="text-cyan-400" />
                                Чат с родителями и тренерами
                            </h4>
                            <p className="text-[11px] text-white/40">
                                Открыть единый мессенджер клуба и диалоги.
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenMessages?.()}
                            className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                            <MessageSquare size={13} />
                            <span>Перейти в диалоги</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* BLOCK 3: 👁️ ПОСМОТРЕТЬ САЙТ ГЛАЗАМИ (Примерка ролей с мгновенным переходом в раздел) */}
            <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-sparta-gold" />
                        <h3 className="font-russo text-sm md:text-base text-white uppercase tracking-wider">
                            Посмотреть сайт глазами других
                        </h3>
                    </div>
                    {currentImpersonatedRole && (
                        <button
                            onClick={() => onImpersonateRole?.(null, 'analytics')}
                            className="text-[11px] font-bold text-sparta-gold hover:underline flex items-center gap-1"
                        >
                            <LogOut size={12} />
                            <span>Сбросить примерку</span>
                        </button>
                    )}
                </div>
                <p className="text-white/40 text-xs">
                    Нажмите на роль, чтобы сразу перейти в соответствующий раздел и протестировать интерфейс:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {roleOptions.map(r => {
                        const isCurrent = (currentImpersonatedRole === r.id) || (!currentImpersonatedRole && r.id === null);
                        const Icon = r.icon;
                        return (
                            <button
                                key={r.title}
                                onClick={() => {
                                    onImpersonateRole?.(r.id, r.targetTab);
                                    triggerToast(r.id ? `Включен просмотр: ${r.title}` : 'Возврат на главную');
                                }}
                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                    isCurrent
                                        ? `${r.color} shadow-lg ring-2 ring-sparta-gold`
                                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.06]'
                                }`}
                            >
                                <Icon size={18} className={isCurrent ? 'text-sparta-gold' : 'text-white/60'} />
                                <span className="text-xs font-bold text-white">{r.title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* BLOCK 4: 🔍 БЫСТРЫЙ ПОИСК УЧЕНИКА */}
            <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search size={16} className="text-sparta-gold" />
                        <h3 className="font-russo text-sm md:text-base text-white uppercase tracking-wider">
                            Быстрый поиск ученика
                        </h3>
                    </div>
                </div>

                {/* Single Search Bar */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Введите имя ребенка, телефон или 4-значный PIN..."
                        className="w-full pl-11 pr-4 py-3.5 bg-black/60 border border-white/10 rounded-2xl text-xs md:text-sm text-white placeholder:text-white/30 focus:border-sparta-gold/60 focus:outline-none transition-all"
                    />
                    {isSearching && (
                        <RefreshCw size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-sparta-gold animate-spin" />
                    )}
                </div>

                {/* Found Student Cards */}
                {searchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {searchResults.map(u => (
                            <div
                                key={u.id}
                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-md"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white truncate">
                                            {u.childName || u.displayName || u.name || 'Без имени'}
                                        </span>
                                        {u.coins !== undefined && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                                🪙 {u.coins}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-white/40 space-x-2 truncate">
                                        {u.phone && <span>📱 {u.phone}</span>}
                                        {u.kidPin && <span className="text-emerald-400 font-mono font-bold">PIN: {u.kidPin}</span>}
                                    </div>
                                </div>

                                {/* Action: Give 50 coins */}
                                <button
                                    onClick={() => handleQuickAddCoins(u.id, u.coins)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer ${
                                        coinFeedbackUserId === u.id
                                            ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                                            : 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/40 hover:bg-sparta-gold/30'
                                    }`}
                                >
                                    {coinFeedbackUserId === u.id ? <Check size={13} /> : <Gift size={13} />}
                                    <span>+50 🪙</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* BLOCK 5: 💳 ПОСЛЕДНИЕ ОПЛАТЫ И ЗАКАЗЫ (С фильтрами и просмотром чека) */}
            {allOrders.length > 0 && (
                <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-4 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CreditCard size={16} className="text-sparta-gold" />
                            <h3 className="font-russo text-sm md:text-base text-white uppercase tracking-wider">
                                История операций и оплат
                            </h3>
                        </div>

                        {/* Category Filter Chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                            {[
                                { id: 'all', label: 'Все' },
                                { id: 'subscription', label: '💳 Абонементы' },
                                { id: 'shop', label: '🛍️ Магазин' },
                                { id: 'topup', label: '🪙 Монеты' },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setOrdersCategoryFilter(cat.id as any)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                        ordersCategoryFilter === cat.id
                                            ? 'bg-sparta-gold text-black font-black shadow-md'
                                            : 'bg-white/5 text-white/50 hover:text-white'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => {
                                    setSelectedOrderForReceipt(order);
                                    setActiveModal('receipt');
                                }}
                                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-sparta-gold/30 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
                            >
                                <div className="min-w-0">
                                    <div className="font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                        {order.description || order.productTitle || order.programTitle || 'Оплата заказа'}
                                    </div>
                                    <div className="text-[11px] text-white/40 truncate mt-0.5">
                                        {order.userEmail || order.userName || order.id} • {order.parsedDate?.toLocaleDateString?.('ru-RU') || 'Недавно'}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-russo text-sparta-gold text-sm">
                                        {Number(order.totalAmount || order.price || order.amount || 0).toLocaleString('ru-RU')} ₽
                                    </div>
                                    <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 justify-end">
                                        <span>{order.status === 'completed' || order.status === 'paid' ? 'Оплачено ✅' : (order.status || 'В обработке')}</span>
                                        <ChevronRight size={12} className="text-white/30 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🌟 ИНТЕРАКТИВНЫЕ МОДАЛЬНЫЕ ОКНА ДЛЯ ВСЕХ КАРТОЧЕК 🌟 */}
            {/* ========================================================================= */}

            {/* 1. MODAL: ДЕТАЛИЗАЦИЯ ВЫРУЧКИ */}
            <AnimatePresence>
                {activeModal === 'revenue' && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#121212] border border-white/15 rounded-3xl p-5 md:p-6 max-w-xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="font-russo text-white text-base uppercase">Выручка и финансы</h3>
                                    <p className="text-white/40 text-xs">Сегодня: {todayRevenue.toLocaleString('ru-RU')} ₽ | Месяц: {monthRevenue.toLocaleString('ru-RU')} ₽</p>
                                </div>
                                <button onClick={() => setActiveModal('none')} className="p-1 text-white/40 hover:text-white text-lg">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                <span className="text-xs font-bold text-white/60 uppercase">Оплаты за сегодня ({todayOrders.length}):</span>
                                {todayOrders.length > 0 ? (
                                    todayOrders.map(o => (
                                        <div key={o.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-bold text-white">{o.description || 'Оплата абонемента'}</div>
                                                <div className="text-white/40 text-[11px]">{o.userEmail || o.userName}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-russo text-sparta-gold">{o.numAmount} ₽</div>
                                                <div className="text-[10px] text-emerald-400 font-bold">Robokassa ✅</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-white/30 text-xs">За сегодня еще не было оплат</div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-white/10 flex gap-2">
                                <a
                                    href="/admin/finance"
                                    className="flex-1 py-3 bg-sparta-gold text-black rounded-xl font-black text-xs uppercase text-center flex items-center justify-center gap-1.5"
                                >
                                    <span>Открыть полную кассу</span>
                                    <ArrowUpRight size={14} />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 2. MODAL: СПИСОК ВСЕХ УЧЕНИКОВ */}
            <AnimatePresence>
                {activeModal === 'students' && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#121212] border border-white/15 rounded-3xl p-5 md:p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="font-russo text-white text-base uppercase">Реестр учеников Спарты</h3>
                                    <p className="text-white/40 text-xs">Всего зарегистрировано: {allStudents.length} детей</p>
                                </div>
                                <button onClick={() => setActiveModal('none')} className="p-1 text-white/40 hover:text-white text-lg">✕</button>
                            </div>

                            {/* Search & Sports filter */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={studentSearchModalQuery}
                                    onChange={e => setStudentSearchModalQuery(e.target.value)}
                                    placeholder="Поиск по имени или телефону..."
                                    className="flex-1 px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30"
                                />
                                <div className="flex gap-1">
                                    {[
                                        { id: 'all', label: 'Все' },
                                        { id: 'football', label: 'Футбол' },
                                        { id: 'tennis', label: 'Теннис' },
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setStudentSportFilter(s.id as any)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold ${
                                                studentSportFilter === s.id
                                                    ? 'bg-sparta-gold text-black font-black'
                                                    : 'bg-white/5 text-white/60 hover:text-white'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {filteredModalStudents.map(st => (
                                    <div key={st.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span>{st.childName || st.name || 'Без имени'}</span>
                                                {st.coins !== undefined && <span className="text-[10px] text-amber-300 font-bold">🪙 {st.coins}</span>}
                                            </div>
                                            <div className="text-white/40 text-[11px]">
                                                {st.phone || st.email || 'Без телефона'} • {st.groupName || 'Основная группа'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleQuickAddCoins(st.id, st.coins)}
                                            className="px-2.5 py-1.5 bg-sparta-gold/20 text-sparta-gold rounded-lg text-[11px] font-bold border border-sparta-gold/30 hover:bg-sparta-gold/30"
                                        >
                                            +50 🪙
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <a
                                    href="/admin/users"
                                    className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                                >
                                    <span>Управление пользователями в CRM</span>
                                    <ArrowUpRight size={14} />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. MODAL: НОВЫЕ ЗАЯВКИ */}
            <AnimatePresence>
                {activeModal === 'requests' && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#121212] border border-white/15 rounded-3xl p-5 md:p-6 max-w-xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div>
                                    <h3 className="font-russo text-white text-base uppercase">Новые заявки на пробное</h3>
                                    <p className="text-white/40 text-xs">Лиды, ожидающие звонка администратора</p>
                                </div>
                                <button onClick={() => setActiveModal('none')} className="p-1 text-white/40 hover:text-white text-lg">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map(r => (
                                        <div key={r.id} className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-white">{r.name || r.childName || 'Новая заявка'}</span>
                                                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-full">
                                                    {r.direction || r.sport || 'Секция'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-white/50">
                                                Возраст: {r.age || r.childAge || 'Не указан'} • Город: {r.city || 'Челябинск'}
                                            </div>
                                            {r.phone && (
                                                <div className="flex gap-2 pt-1">
                                                    <a
                                                        href={`tel:${r.phone}`}
                                                        className="flex-1 py-2 bg-emerald-500 text-black font-black rounded-xl text-xs text-center flex items-center justify-center gap-1.5 shadow-md"
                                                    >
                                                        <Phone size={13} />
                                                        <span>Позвонить: {r.phone}</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-white/30 text-xs">Все заявки обработаны! Новых лидов нет.</div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <a
                                    href="/admin/requests"
                                    className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                                >
                                    <span>Воронка заявок в CRM</span>
                                    <ArrowUpRight size={14} />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 4. MODAL: ЭЛЕКТРОННЫЙ ЧЕК ОПЕРАЦИИ */}
            <AnimatePresence>
                {activeModal === 'receipt' && selectedOrderForReceipt && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#121212] border border-sparta-gold/30 rounded-3xl p-5 md:p-6 max-w-md w-full space-y-4 shadow-2xl relative"
                        >
                            <div className="text-center border-b border-white/10 pb-4">
                                <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center mx-auto mb-2">
                                    <Receipt size={24} />
                                </div>
                                <h3 className="font-russo text-white text-base uppercase tracking-wider">Электронный чек Sparta</h3>
                                <p className="text-white/40 text-xs">Заказ #{selectedOrderForReceipt.id.substring(0, 10)}</p>
                            </div>

                            <div className="space-y-2.5 font-manrope text-xs text-white/80">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-white/40">Услуга:</span>
                                    <span className="font-bold text-white text-right">{selectedOrderForReceipt.description || 'Абонемент Sparta'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-white/40">Плательщик:</span>
                                    <span className="text-white">{selectedOrderForReceipt.userEmail || selectedOrderForReceipt.userName || 'Клиент'}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-white/40">Сумма:</span>
                                    <span className="font-russo text-sparta-gold text-base">{Number(selectedOrderForReceipt.totalAmount || selectedOrderForReceipt.price || selectedOrderForReceipt.amount || 0).toLocaleString('ru-RU')} ₽</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-white/40">Шлюз:</span>
                                    <span className="text-blue-400 font-bold">Robokassa (spartacenter)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/40">Статус:</span>
                                    <span className="text-emerald-400 font-bold">Оплачено успешно ✅</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveModal('none')}
                                className="w-full py-3 bg-sparta-gold text-black font-black rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all"
                            >
                                Закрыть чек
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeveloperConsole;
