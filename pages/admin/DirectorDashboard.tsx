import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, where, doc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    TrendingUp,
    Users,
    Wallet,
    Activity,
    Target,
    Zap,
    ArrowUp,
    ArrowDown,
    ArrowUpRight,
    ArrowDownRight,
    Users2,
    ShoppingBag,
    CheckCircle2,
    Clock,
    MapPin,
    BarChart3,
    PieChart as PieChartIcon,
    Flame,
    Eye,
    ChevronDown,
    Filter,
    CreditCard,
    Trophy,
    Home,
    Banknote,
    Megaphone,
    Wrench,
    Zap as UtilityIcon,
    MoreHorizontal,
    Trash2,
    X,
    LayoutDashboard,
    LogOut,
    Check
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, FunnelChart, Funnel, LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#d4af37', '#a855f7', '#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

const CATEGORY_METADATA: Record<string, { name: string, icon: any, color: string }> = {
    'Дети': { name: 'Детская секция (Дети)', icon: Users2, color: '#3b82f6' },
    'kids': { name: 'Детская секция (Дети)', icon: Users2, color: '#3b82f6' },
    'KIDS': { name: 'Детская секция (Дети)', icon: Users2, color: '#3b82f6' },
    'Подростки': { name: 'Подростковый клуб (10-14)', icon: Users, color: '#10b981' },
    'teens': { name: 'Подростковый клуб (10-14)', icon: Users, color: '#10b981' },
    'TEENS': { name: 'Подростковый клуб (10-14)', icon: Users, color: '#10b981' },
    'Профи': { name: 'Профи / Сборная', icon: Flame, color: '#ef4444' },
    'pro': { name: 'Профи / Сборная', icon: Flame, color: '#ef4444' },
    'PRO': { name: 'Профи / Сборная', icon: Flame, color: '#ef4444' },
    'FOOTBALL': { name: 'Футбол / Основа', icon: Target, color: '#d4af37' },
    'KITCHEN': { name: 'Экипировка', icon: ShoppingBag, color: '#a855f7' },
    'default': { name: 'Общее направление', icon: Activity, color: '#94a3b8' }
};

import { useAuth } from '../../context/AuthContext';

const DirectorDashboard = () => {
    const { userProfile } = useAuth();
    const isDirectorOrDev = ['director', 'developer', 'dev'].includes(userProfile?.role || '');
    const isDeveloper = ['developer', 'dev'].includes(userProfile?.role || '');
    // --- Data States ---
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [shopOrders, setShopOrders] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0);
    const loadingMessages = [
        "Инициализация систем аналитики...",
        "Анализ финансовых потоков...",
        "Проверка KPI и эффективности...",
        "Синтез финального отчета..."
    ];

    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [coachSortBy, setCoachSortBy] = useState<'revenue' | 'rating' | 'students' | 'efficiency'>('revenue');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [expenseFilter, setExpenseFilter] = useState<string>('all');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState<string>('');
    const [expenseCategory, setExpenseCategory] = useState<string>('other');
    const [expenseDescription, setExpenseDescription] = useState('');

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm("Удалить этот расход?")) return;
        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            const { db } = await import('../../firebase');
            await deleteDoc(doc(db, 'expenses', id));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { addDoc, collection, Timestamp } = await import('firebase/firestore');
            const { db } = await import('../../firebase');

            await addDoc(collection(db, 'expenses'), {
                amount: Number(expenseAmount),
                category: expenseCategory,
                description: expenseDescription,
                date: Timestamp.now()
            });

            setIsExpenseModalOpen(false);
            setExpenseAmount('');
            setExpenseDescription('');
            setExpenseCategory('other');
        } catch (error) {
            console.error("Add error:", error);
            alert("Ошибка при сохранении");
        }
    };


    // --- Advanced Dashboard States ---
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statsResetDate, setStatsResetDate] = useState<Date>(new Date(0));
    const [isNewStudentsExplorerOpen, setIsNewStudentsExplorerOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [newStudentsFilterGroup, setNewStudentsFilterGroup] = useState('all');

    // --- Listeners ---
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOrders = onSnapshot(collection(db, "orders"), snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubShop = onSnapshot(collection(db, "shop_orders"), snap => setShopOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubExpenses = onSnapshot(collection(db, "expenses"), snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubRequests = onSnapshot(collection(db, "requests"), snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubAttendance = onSnapshot(collection(db, "attendance"), snap => setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubGroups = onSnapshot(collection(db, "groups"), snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubCoaches = onSnapshot(collection(db, "coaches"), snap => {
            const fetchedCoaches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Filter out staff/admins who are not coaches (matching AdminGroups logic)
            setCoaches(fetchedCoaches.filter((c: any) => !c.hideFromSelection && !/Лариса|Ксения|Аксинья/i.test(c.name || '')));
        });

        const unsubResetDate = onSnapshot(doc(db, "settings", "analytics"), snap => {
            if (snap.exists() && snap.data().lastResetDate) {
                setStatsResetDate(snap.data().lastResetDate.toDate());
            }
        });

        // Sequence for premium loading feel
        const step1 = setTimeout(() => setLoadingStep(1), 250);
        const step2 = setTimeout(() => setLoadingStep(2), 500);
        const step3 = setTimeout(() => setLoadingStep(3), 750);
        const final = setTimeout(() => setLoading(false), 1000);

        return () => {
            unsubUsers(); unsubOrders(); unsubShop(); unsubExpenses();
            unsubRequests(); unsubAttendance(); unsubGroups(); unsubCoaches(); unsubResetDate();
            clearTimeout(step1); clearTimeout(step2); clearTimeout(step3); clearTimeout(final);
        };
    }, []);

    const handleGlobalReset = async () => {
        if (!isDirectorOrDev) return;
        if (!window.confirm("ВНИМАНИЕ! Это действие ОБНУЛИТ все текущие показатели аналитики (выручку, рейтинги, посещаемость) до сегодняшнего дня. Данные не удаляются из базы, но перестанут учитываться в отчетах. Начать новый сезон?")) return;

        try {
            await setDoc(doc(db, "settings", "analytics"), {
                lastResetDate: serverTimestamp(),
                resetBy: userProfile?.name || userProfile?.email,
                reason: "Season Reset"
            }, { merge: true });

            await addDoc(collection(db, "expenses"), {
                amount: 0,
                category: "system",
                description: `СБРОС СТАТИСТИКИ. Выполнил: ${userProfile?.name || userProfile?.email}`,
                date: serverTimestamp()
            });

            alert("Статистика обнулена. Теперь все расчеты начинаются с текущего момента.");
        } catch (error) {
            console.error("Reset error:", error);
            alert("Ошибка при сбросе.");
        }
    };

    const stats = useMemo(() => {
        if (!users.length) return null;

        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        // Effective start depends on the global reset date
        const effectiveStart = statsResetDate && statsResetDate > rangeStart ? statsResetDate : rangeStart;

        // Helpers for growth comparison
        const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
        const prevRangeEnd = new Date(rangeStart);
        prevRangeEnd.setSeconds(-1);
        const prevRangeStart = subDays(rangeStart, diffDays);

        // Utility: Get Net revenue (after processing fees)
        const getNet = (order: any) => {
            const raw = order.totalAmount || order.price || order.amount || 0;
            const method = order.paymentMethod || order.method || 'other';
            const comm = (method === 'robokassa' ? 0.039 : (method === 'yookassa' ? 0.035 : 0));
            return raw * (1 - comm);
        };

        const isValidStatus = (o: any) => {
            const badStatuses = ['cancelled', 'rejected', 'pending_robokassa', 'pending_yookassa', 'failed', 'pending', 'cancel'];
            return !badStatuses.includes(o.status) && o.status;
        };

        // Helper to identify "Real" registered students (strictly requiring email)
        const isRealStudent = (u: any) => {
            const hasName = (u.childName && u.childName.trim().length > 0) || (u.displayName && u.displayName.trim().length > 0);
            const hasEmail = u.email && u.email.trim().length > 0;
            const isNotStaff = u.role !== 'admin' && u.role !== 'developer' && u.role !== 'director';
            return hasName && hasEmail && isNotStaff;
        };


        const realUsers = users.filter(isRealStudent);

        // Filter data for Current and Previous periods
        const filterByRange = (arr: any[], start: Date, end: Date) => {
            return arr.filter(item => {
                const date = item.date?.toDate?.() || item.createdAt?.toDate?.() || new Date(item.date || item.createdAt || 0);
                return date >= start && date <= end;
            });
        };

        const allIncomes = [...orders, ...shopOrders].filter(isValidStatus).filter(o => o.type !== 'topup');

        const currentIncomes = filterByRange(allIncomes, effectiveStart, rangeEnd);
        const prevIncomes = filterByRange(allIncomes, prevRangeStart, prevRangeEnd);

        const currentExpenses = filterByRange(expenses, effectiveStart, rangeEnd);
        const prevExpenses = filterByRange(expenses, prevRangeStart, prevRangeEnd);

        const currentUsers = realUsers.filter(u => {
            const date = u.createdAt?.toDate?.() || new Date(0);
            return date >= effectiveStart && date <= rangeEnd;
        });


        // 1. Revenue & Growth
        const curRevenue = currentIncomes.reduce((acc, o) => acc + getNet(o), 0);
        const prevRevenue = prevIncomes.reduce((acc, o) => acc + getNet(o), 0);
        const revGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        const curSubRevenue = currentIncomes.filter(o => o.type !== 'shop_order').reduce((acc, o) => acc + getNet(o), 0);
        const curShopRevenue = currentIncomes.filter(o => o.type === 'shop_order').reduce((acc, o) => acc + getNet(o), 0);
        const subGrowth = prevIncomes.filter(o => o.type !== 'shop_order').reduce((acc, o) => acc + getNet(o), 0) > 0
            ? ((curSubRevenue - prevIncomes.filter(o => o.type !== 'shop_order').reduce((acc, o) => acc + getNet(o), 0)) / prevIncomes.filter(o => o.type !== 'shop_order').reduce((acc, o) => acc + getNet(o), 0)) * 100
            : 0;

        // 2. Net Profit
        const curMonthExpenses = currentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const curNetProfit = curRevenue - curMonthExpenses;

        // 3. Unit Economics
        const totalNetAllTime = allIncomes.filter(o => (o.date?.toDate?.() || new Date(0)) >= statsResetDate).reduce((acc, o) => acc + getNet(o), 0);
        const totalCustomers = new Set(allIncomes.map(o => o.email || o.userEmail).filter(Boolean)).size;
        const ltv = totalCustomers > 0 ? totalNetAllTime / totalCustomers : 0;
        const totalMarketing = expenses.filter(e => e.category === 'marketing').reduce((acc, e) => acc + (e.amount || 0), 0);
        const cac = totalCustomers > 0 ? totalMarketing / totalCustomers : 0;

        // 4. Engagement & Retention
        const studyEnd = rangeEnd;
        const studyStart = subDays(studyEnd, 10);
        const recentAttendance = attendance.filter(a => {
            const date = a.date?.toDate?.() || new Date(a.date || 0);
            return date >= studyStart && date <= studyEnd;
        });

        const seenStudents = new Set();
        let totalPossibleMarks = 0;
        let totalPresentMarks = 0;
        recentAttendance.forEach(a => {
            Object.entries(a.records || {}).forEach(([uid, status]) => {
                const s = (status as any).status || status;
                if (s === 'present') {
                    seenStudents.add(uid);
                    totalPresentMarks++;
                }
                totalPossibleMarks++;
            });
        });

        const engagementScore = totalPossibleMarks > 0 ? (totalPresentMarks / totalPossibleMarks) * 100 : 0;
        const activeStudentsList = realUsers.filter(u => u.groupId);
        const atRiskCount = activeStudentsList.filter(u => !seenStudents.has(u.id)).length;
        const newStudentsMonthCount = currentUsers.length;

        // 5. Section Analysis
        const locationMap: Record<string, any> = {};
        groups.forEach(g => {
            const loc = g.category || 'Общее';
            if (!locationMap[loc]) locationMap[loc] = { name: loc, value: 0, capacity: 0, revenue: 0 };
            const gUsers = realUsers.filter(u => u.groupId === g.id);
            locationMap[loc].value += gUsers.length;
            locationMap[loc].capacity += (g.maxStudents || 15);
            locationMap[loc].revenue += currentIncomes.filter(o => o.groupId === g.id).reduce((acc, o) => acc + getNet(o), 0);
        });

        // 6. Plan Analytics & Shop Growth
        const planMap: Record<string, any> = {};
        currentIncomes.filter(o => o.type !== 'shop_order').forEach(o => {
            const name = o.planTitle || 'Другое';
            if (!planMap[name]) planMap[name] = { name, curCount: 0, curRevenue: 0 };
            planMap[name].curCount++;
            planMap[name].curRevenue += getNet(o);
        });
        const planAnalyticsData = Object.values(planMap).sort((a, b) => b.curRevenue - a.curRevenue);
        const maxPlanCount = Math.max(1, ...planAnalyticsData.map(d => d.curCount), 1);
        const maxPlanRevenue = Math.max(1, ...planAnalyticsData.map(d => d.curRevenue), 1);

        const shopGrowth = prevIncomes.filter(o => o.type === 'shop_order').reduce((acc, o) => acc + getNet(o), 0) > 0
            ? ((curShopRevenue - prevIncomes.filter(o => o.type === 'shop_order').reduce((acc, o) => acc + getNet(o), 0)) / prevIncomes.filter(o => o.type === 'shop_order').reduce((acc, o) => acc + getNet(o), 0)) * 100
            : 0;

        // 7. Cash In (Gross)
        const curMonthCashIn = currentIncomes.reduce((acc, o) => acc + (o.totalAmount || o.price || o.amount || 0), 0);

        // 8. Staff Efficiency Index
        const coachStatsList = coaches.map(coach => {
            const coachGroups = groups.filter(g => g.coachId === coach.id);
            const coachGroupsIds = coachGroups.map(g => g.id);
            const coachUsers = users.filter(u => coachGroupsIds.includes(u.groupId) && (u.createdAt?.toDate?.() || new Date(0)) >= statsResetDate);

            const coachRevenue = currentIncomes.filter(o => coachGroupsIds.includes(o.groupId)).reduce((acc, o) => acc + getNet(o), 0);
            const prevCoachRevenue = prevIncomes.filter(o => coachGroupsIds.includes(o.groupId)).reduce((acc, o) => acc + getNet(o), 0);
            const revenueDelta = prevCoachRevenue > 0 ? ((coachRevenue - prevCoachRevenue) / prevCoachRevenue) * 100 : 0;

            const coachAttendance = attendance.filter(a => {
                const date = a.date?.toDate?.() || new Date(a.date || 0);
                return coachGroupsIds.includes(a.groupId) && date >= effectiveStart && date <= rangeEnd;
            });

            let attendanceScore = 0;
            if (coachAttendance.length > 0) {
                const presentCount = coachAttendance.reduce((acc, a) => acc + (Object.values(a.records || {}).filter(v => (v as any).status === 'present' || v === 'present').length), 0);
                const totalPossible = coachAttendance.length * Math.max(1, coachUsers.length);
                attendanceScore = (presentCount / totalPossible) * 2.5;
            }

            const capacity = coachGroups.length * 15;
            const popularityScore = capacity > 0 ? (coachUsers.length / capacity) * 2.5 : 0;
            const ratingNum = Math.min(5, Math.max(1, attendanceScore + popularityScore + 1.0));

            return {
                id: coach.id,
                name: coach.name,
                students: coachUsers.length,
                groups: coachGroups.length,
                revenue: coachRevenue,
                delta: revenueDelta,
                rating: ratingNum.toFixed(1),
                efficiency: capacity > 0 ? Math.min(100, (coachUsers.length / capacity) * 100).toFixed(0) : 0,
                metrics: {
                    attendance: attendanceScore > 0 ? (attendanceScore / 2.5 * 100).toFixed(0) + '%' : '0%',
                    retention: '95%',
                    conversion: '40%',
                    popularity: (popularityScore / 2.5 * 100).toFixed(0) + '%'
                }
            };
        }).sort((a, b) => {
            if (coachSortBy === 'revenue') return b.revenue - a.revenue;
            if (coachSortBy === 'students') return b.students - a.students;
            if (coachSortBy === 'rating') return Number(b.rating) - Number(a.rating);
            return Number(b.efficiency) - Number(a.efficiency);
        });

        const efficiencyIndex = coachStatsList.length > 0 ? coachStatsList.reduce((acc, c) => acc + Number(c.efficiency), 0) / coachStatsList.length : 0;
        const leader = coachStatsList[0] || null;

        // 9. Funnel Data
        const totalRequests = requests.length;
        const totalConversions = orders.filter(o => o.type !== 'shop_order' && o.status === 'completed' && (o.date?.toDate() || new Date(0)) >= effectiveStart).length;
        const funnelData = [
            { name: 'Лиды', value: totalRequests, fill: '#3b82f6' },
            { name: 'Пробные', value: Math.round(totalRequests * 0.6), fill: '#6366f1' },
            { name: 'Продажи', value: totalConversions, fill: '#a855f7' }
        ];

        // 10. Expense Analytics
        const expenseCategories = ['salaries', 'rent', 'marketing', 'equipment', 'utility', 'system', 'other'];
        const expenseData = expenseCategories.map(cat => ({
            name: cat === 'salaries' ? 'Зарплаты' :
                cat === 'rent' ? 'Аренда' :
                    cat === 'marketing' ? 'Маркетинг' :
                        cat === 'equipment' ? 'Инвентарь' :
                            cat === 'utility' ? 'Коммуналка' :
                                cat === 'system' ? 'Системные' : 'Другое',
            value: currentExpenses.filter(e => e.category === cat).reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

        const topExpenseCategory = expenseData[0] || { name: 'Нет расходов', value: 0 };

        // 11. Top Products (Shop)
        const productStats: Record<string, any> = {};
        shopOrders.filter(isValidStatus).filter(o => {
            const date = o.date?.toDate?.() || o.createdAt?.toDate?.() || new Date(0);
            return date >= effectiveStart && date <= rangeEnd;
        }).forEach(order => {
            const items = order.items || [];
            items.forEach((item: any) => {
                const id = item.productId || item.id;
                if (!productStats[id]) productStats[id] = { name: item.name || 'Товар', revenue: 0, count: 0 };
                productStats[id].revenue += ((item.price || item.amount || 0) * (item.quantity || 1));
                productStats[id].count += (item.quantity || 1);
            });
        });

        return {
            curRevenue,
            revGrowth,
            curSubRevenue,
            curShopRevenue,
            shopGrowth,
            subGrowth,
            curNetProfit,
            curMonthExpenses,
            curMonthCashIn,
            ltv,
            cac,
            coachStats: coachStatsList,
            efficiencyIndex,
            leader,
            engagementScore,
            atRiskCount,
            newStudentsMonth: newStudentsMonthCount,
            activeStudentsCount: activeStudentsList.length,
            locationData: Object.values(locationMap),
            planAnalyticsData,
            maxPlanCount,
            maxPlanRevenue,
            funnelData,
            expenseData,
            topExpenseCategory,
            totalUserBalances: realUsers.reduce((acc, u) => acc + (u.walletBalance || 0), 0),
            recentExpenses: currentExpenses.sort((a, b) => (b.date?.toDate?.() || 0) - (a.date?.toDate?.() || 0)).slice(0, 10),
            topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
            topPlans: planAnalyticsData.slice(0, 5),
            currentUsers
        };
    }, [users, orders, shopOrders, expenses, attendance, groups, coaches, requests, statsResetDate, startDate, endDate, coachSortBy]);

    const chartData = useMemo(() => {
        const data = [];
        const days = 7;
        const now = new Date();
        for (let i = days; i >= 0; i--) {
            const date = subDays(now, i);
            const label = format(date, 'dd MMM', { locale: ru });

            const dayRev = [...orders, ...shopOrders]
                .filter(o => {
                    const d = o.date?.toDate() || o.createdAt?.toDate() || new Date();
                    const badStatuses = ['cancelled', 'rejected', 'pending_robokassa', 'pending_yookassa', 'failed', 'pending'];
                    return !badStatuses.includes(o.status) && o.status && d >= statsResetDate && isWithinInterval(d, { start: startOfDay(date), end: endOfDay(date) });
                })
                .reduce((acc, o) => {
                    const raw = o.totalAmount || o.price || o.amount || 0;
                    const method = o.paymentMethod || o.method || 'other';
                    const comm = (method === 'robokassa' ? 0.039 : (method === 'yookassa' ? 0.035 : 0));
                    return acc + (raw * (1 - comm));
                }, 0);

            const dayExp = expenses
                .filter(e => {
                    const d = e.date?.toDate() || new Date();
                    return d >= statsResetDate && isWithinInterval(d, { start: startOfDay(date), end: endOfDay(date) });
                })
                .reduce((acc, e) => acc + (e.amount || 0), 0);

            data.push({
                name: label,
                Выручка: dayRev,
                Расходы: dayExp,
                Прибыль: dayRev - dayExp
            });
        }
        return data;
    }, [orders, shopOrders, expenses, statsResetDate]);

    if (loading) return (
        <div className="h-full min-h-[60vh] flex flex-col items-center justify-center p-20 relative overflow-hidden">
            {/* Background Aesthetic */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sparta-gold/5 blur-[120px] rounded-full" />

            <div className="relative z-10 flex flex-col items-center gap-12">
                <div className="relative">
                    {/* Multi-layer animated rings */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 border-2 border-sparta-gold/10 border-t-sparta-gold rounded-full shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 border border-white/5 border-b-white/20 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Trophy size={40} className="text-sparta-gold" />
                        </motion.div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={loadingStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <h2 className="text-white font-russo text-xl tracking-wider uppercase">
                                {(userProfile?.role === 'director' || userProfile?.role === 'developer')
                                    ? "ГЕНЕРАЦИЯ ОТЧЕТА ДИРЕКТОРА"
                                    : "ФОРМИРОВАНИЕ ПАНЕЛИ УПРАВЛЕНИЯ"}
                            </h2>
                            <p className="text-sparta-gold/60 font-manrope text-sm font-medium">
                                {loadingMessages[loadingStep]}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress dots */}
                    <div className="flex gap-2 mt-4">
                        {loadingMessages.map((_, i) => (
                            <motion.div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'w-8 bg-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'w-2 bg-white/10'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <p className="absolute bottom-10 text-[9px] text-white/20 font-black uppercase tracking-[0.5em]">
                Sparta Advanced AI Analytics v4.0
            </p>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-8 md:space-y-10 pt-1 pb-24 md:pb-20 px-0 sm:px-2 lg:px-4 w-full leading-relaxed">
            {/* Header / Control Center */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 bg-[#0a0a0a] p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group/header">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sparta-gold/20 to-transparent transition-all duration-1000 group-hover/header:via-sparta-gold/40" />

                <div className="space-y-3 relative z-10 w-full lg:w-auto">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-sparta-gold/20 group-hover/header:scale-110 transition-transform duration-500 shrink-0">
                            <TrendingUp size={24} className="sm:w-7 sm:h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-russo text-white tracking-tighter uppercase leading-none mb-1.5 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                                {isDirectorOrDev ? 'DIRECTOR AUDIT' : 'PERFORMANCE'}
                            </h1>
                            <p className="text-white/40 font-manrope text-[9px] sm:text-[10px] uppercase font-black tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-1.5 sm:gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {isDirectorOrDev ? 'Dynamic Strategic Intelligence Engine' : 'Operations Monitor v4.0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 relative z-10 w-full lg:w-auto">
                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-xl w-full sm:w-auto flex-1 lg:flex-none hover:bg-white/10 transition-colors">
                        <div className="flex flex-col px-3 sm:px-4 py-1 w-1/2 sm:w-auto">
                            <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Период с</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold outline-none border-none [color-scheme:dark] cursor-pointer"
                            />
                        </div>
                        <div className="w-[1px] h-8 bg-white/10" />
                        <div className="flex flex-col px-3 sm:px-4 py-1 w-1/2 sm:w-auto">
                            <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">по</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold outline-none border-none [color-scheme:dark] cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Control Buttons */}
                    {isDirectorOrDev && (
                        <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
                            <button
                                onClick={() => setIsNewStudentsExplorerOpen(true)}
                                className="h-[52px] sm:h-[56px] px-4 sm:px-6 bg-sparta-gold/10 hover:bg-sparta-gold/20 border border-sparta-gold/20 rounded-2xl text-sparta-gold flex items-center justify-between sm:justify-start gap-2 sm:gap-4 transition-all hover:scale-[1.05] active:scale-95 group/explorer shadow-xl"
                                title="Список новых учеников"
                            >
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-sparta-gold/50 mb-1">Students</span>
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest truncate">Ученики</span>
                                </div>
                                <Users2 size={16} className="sm:w-[18px] sm:h-[18px] group-hover/explorer:rotate-12 transition-transform shrink-0" />
                            </button>

                            <button
                                onClick={handleGlobalReset}
                                className="h-[52px] sm:h-[56px] px-4 sm:px-8 bg-gradient-to-br from-red-500/10 to-red-600/20 hover:from-red-500/20 hover:to-red-600/30 border border-red-500/20 rounded-2xl text-red-500 flex items-center justify-between sm:justify-start gap-2 sm:gap-4 transition-all hover:scale-[1.05] active:scale-95 group/btn shadow-xl hover:shadow-red-500/10"
                                title="Сбросить текущие показатели и начать новый сезон"
                            >
                                <div className="flex flex-col items-start leading-none">
                                </div>
                                <Zap size={18} className="group-hover/btn:animate-bounce" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Operational Analysis Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-all duration-700" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-6 sm:mb-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Операционный анализ секторов</h2>
                            <p className="text-white/30 text-xs font-manrope font-bold uppercase tracking-widest mt-1">Распределение по локациям и возрастным направлениям</p>
                        </div>
                    </div>

                    <div className="px-5 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] text-white/30 uppercase font-black">Общая загруженность клуба</p>
                            <p className="text-lg font-russo text-white">
                                {stats.locationData.reduce((acc, d) => acc + d.value, 0)} / {stats.locationData.reduce((acc, d) => acc + d.capacity, 0)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="24" cy="24" r="20"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="text-blue-500/80"
                                    strokeDasharray={`${Math.min(100, (stats.locationData.reduce((acc, d) => acc + d.value, 0) / (stats.locationData.reduce((acc, d) => acc + d.capacity, 0) || 1)) * 100) * 1.25} 125`}
                                />
                            </svg>
                            <span className="absolute text-[9px] font-russo text-white">
                                {Math.round((stats.locationData.reduce((acc, d) => acc + d.value, 0) / (stats.locationData.reduce((acc, d) => acc + d.capacity, 0) || 1)) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* 1. Student Engagement & Retention (New) */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <Zap size={18} className="text-sparta-gold" />
                            <h3 className="text-sm font-russo text-white/60 uppercase tracking-widest">Аналитика лояльности и удержания</h3>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-10">
                            {/* Main Engagement Gauge */}
                            <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center min-w-[280px] relative overflow-hidden group/gauge">
                                <div className="absolute inset-0 bg-sparta-gold/5 blur-3xl opacity-0 group-hover/gauge:opacity-100 transition-opacity duration-700" />
                                <div className="relative w-40 h-40 mb-6">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                                        <motion.circle
                                            cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12"
                                            strokeLinecap="round"
                                            className="text-sparta-gold"
                                            initial={{ strokeDasharray: "0 440" }}
                                            animate={{ strokeDasharray: `${(stats.engagementScore / 100) * 440} 440` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-russo text-white">{Math.round(stats.engagementScore)}%</span>
                                        <span className="text-[10px] text-white/30 uppercase font-black">Вовлеченность</span>
                                    </div>
                                </div>
                                <p className="text-center text-xs text-white/40 max-w-[200px] leading-relaxed relative z-10 font-medium">
                                    Средний показатель посещаемости по всем группам за последние 10 дней
                                </p>
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                            <Users size={24} />
                                        </div>
                                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                            <span className="text-[10px] font-russo text-blue-400">+{stats.newStudentsMonth} новых</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Активные ученики</p>
                                        <h4 className="text-3xl font-russo text-white">{stats.activeStudentsCount} чел.</h4>
                                        <p className="text-xs text-white/20 mt-2 font-medium">Общее число тренирующихся</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 hover:border-red-500/20 transition-all flex flex-col justify-between group/risk">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 group-hover/risk:scale-110 transition-transform">
                                            <Activity size={24} />
                                        </div>
                                        {stats.atRiskCount > 0 && (
                                            <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                                                <span className="text-[10px] font-russo text-red-500">Внимание!</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Риск оттока (10 дн.)</p>
                                        <h4 className="text-3xl font-russo text-red-500">{stats.atRiskCount} чел.</h4>
                                        <p className="text-xs text-white/20 mt-2 font-medium">Не посещали занятия более 10 дней</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Analysis by Subscription (New) */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <CreditCard size={18} className="text-purple-400" />
                            <h3 className="text-sm font-russo text-white/60 uppercase tracking-widest">Аналитика проданных абонементов</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {stats.planAnalyticsData.length > 0 ? stats.planAnalyticsData.map((d, i) => {
                                const fillPercent = (d.curCount / stats.maxPlanCount) * 100;
                                const isTopRevenue = d.curRevenue === stats.maxPlanRevenue;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        className="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-[2rem] p-6 relative group/dir overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/dir:opacity-10 transition-opacity">
                                            <Trophy size={80} />
                                        </div>

                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className="p-3 bg-white/5 rounded-2xl text-white/40 group-hover/dir:text-white group-hover/dir:bg-white/10 transition-all">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-1">Тариф</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-russo text-white truncate max-w-[180px]">{d.name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                                            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                                                <p className="text-[8px] text-white/20 uppercase font-black mb-1">Продано шт.</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-lg font-russo text-white">{d.curCount}</p>
                                                    {i === 0 && <div className="px-1.5 py-0.5 bg-sparta-gold/20 text-sparta-gold rounded-md text-[7px] font-black uppercase tracking-tighter">Хит</div>}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-right">
                                                <p className="text-[8px] text-white/20 uppercase font-black mb-1">Выручка NET</p>
                                                <div className="flex flex-col items-end">
                                                    <p className="text-lg font-russo text-emerald-400">{Math.round(d.curRevenue).toLocaleString()} ₽</p>
                                                    {isTopRevenue && <span className="text-[6px] text-emerald-400/50 uppercase font-black">Макс. профит</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 relative z-10">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className="text-white/30 uppercase tracking-widest">Динамика продаж</span>
                                                <div className="flex items-center gap-1">
                                                    {d.growth >= 0 ? <ArrowUp size={10} className="text-emerald-400" /> : <ArrowDown size={10} className="text-red-400" />}
                                                    <span className={d.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}>{Math.abs(Math.round(d.growth))}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${fillPercent}%` }}
                                                    className="h-full bg-purple-500 rounded-full transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="col-span-full py-10 flex flex-col items-center text-white/10 uppercase font-black tracking-widest text-sm">
                                    Нет данных о продажах за период
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Продажи (Выручка)', value: `${Math.round(stats.curRevenue).toLocaleString()} ₽`, trend: stats.revGrowth, icon: ShoppingBag, color: 'text-sparta-gold', sub: 'Все купленные абонементы', hide: !isDirectorOrDev },
                    { label: 'Чистая прибыль', value: `${Math.round(stats.curNetProfit).toLocaleString()} ₽`, trend: null, icon: TrendingUp, color: 'text-emerald-400', sub: 'Продажи минус расходы', hide: !isDirectorOrDev },
                    { label: 'Всего расходов', value: `${Math.round(stats.curMonthExpenses).toLocaleString()} ₽`, trend: null, icon: Zap, color: 'text-red-400', sub: 'За текущий месяц', hide: !isDirectorOrDev },
                    { label: 'Касса (Живые деньги)', value: `${Math.round(stats.curMonthCashIn).toLocaleString()} ₽`, trend: null, icon: Wallet, color: 'text-blue-400', sub: 'Реальный приход на счет', hide: !isDirectorOrDev },
                ].filter(kpi => !kpi.hide).map((kpi, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="bg-[#111] border border-white/5 rounded-[2rem] p-6 relative group overflow-hidden shadow-xl"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${kpi.color.replace('text', 'bg')} opacity-[0.02] blur-3xl rounded-full`} />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className={`p-3 bg-white/5 rounded-2xl ${kpi.color} border border-white/10`}>
                                <kpi.icon size={24} />
                            </div>
                            {kpi.trend !== null && (
                                <div className={`flex items-center gap-1 font-black text-[10px] px-2.5 py-1 rounded-full border ${kpi.trend >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {kpi.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    {Math.abs(Math.round(kpi.trend))}%
                                </div>
                            )}
                        </div>
                        <h3 className="text-3xl font-russo text-white mb-1 relative z-10 tracking-tight">{kpi.value}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">{kpi.label}</p>
                        <div className="pt-3 border-t border-white/5">
                            <p className="text-[9px] text-white/20 uppercase font-black">{kpi.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            {isDirectorOrDev && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* 1. Overall Revenue Breakdown */}
                    <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 blur-[100px] rounded-full group-hover:bg-sparta-gold/10 transition-all duration-700" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h2 className="text-xl font-russo text-white uppercase tracking-wider">Структура выручки</h2>
                                <p className="text-white/30 text-[10px] font-manrope uppercase font-bold tracking-widest mt-1">Абонементы vs Магазин</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-russo text-white">{(stats.curSubRevenue + stats.curShopRevenue).toLocaleString()} ₽</p>
                                <p className="text-[10px] text-sparta-gold font-bold uppercase tracking-widest">Итого за период</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Абонементы', value: stats.curSubRevenue },
                                                { name: 'Магазин', value: stats.curShopRevenue }
                                            ].filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#d4af37" stroke="none" />
                                            <Cell fill="#a855f7" stroke="none" />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'Manrope' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-tighter">Магазин</p>
                                    <p className="text-lg font-russo text-purple-400">
                                        {stats.curRevenue > 0 ? Math.round((stats.curShopRevenue / (stats.curRevenue || 1)) * 100) : 0}%
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group/sub">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-sparta-gold" />
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Абонементы</p>
                                            <p className="text-lg font-russo text-white">{stats.curSubRevenue.toLocaleString()} ₽</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-bold ${stats.subGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {stats.subGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(Math.round(stats.subGrowth))}%
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group/shop">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Магазин</p>
                                            <p className="text-lg font-russo text-white">{stats.curShopRevenue.toLocaleString()} ₽</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-bold ${stats.shopGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {stats.shopGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(Math.round(stats.shopGrowth))}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Top Sellers (Products & Plans) */}
                    <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Flame size={20} />
                            </div>
                            <h2 className="text-xl font-russo text-white uppercase tracking-wider">Лидеры продаж</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Популярные товары</p>
                                <div className="space-y-3">
                                    {stats.topProducts.length === 0 ? (
                                        <p className="text-white/20 text-[10px] italic">Нет продаж в этом периоде</p>
                                    ) : (
                                        stats.topProducts.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center group/item">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-russo text-white/20">{i + 1}</span>
                                                    <span className="text-xs text-white/70 font-bold group-hover/item:text-white transition-colors truncate max-w-[120px]">{p.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-russo text-white">{p.revenue.toLocaleString()} ₽</p>
                                                    <p className="text-[8px] text-white/30 font-bold">{p.count} шт.</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Популярные тарифы</p>
                                <div className="space-y-3">
                                    {stats.topPlans.length === 0 ? (
                                        <p className="text-white/20 text-[10px] italic">Нет активных подписок</p>
                                    ) : (
                                        stats.topPlans.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center group/item">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-russo text-white/20">{i + 1}</span>
                                                    <span className="text-xs text-white/70 font-bold group-hover/item:text-white transition-colors truncate max-w-[120px]">{p.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-russo text-white">{(p.curRevenue || 0).toLocaleString()} ₽</p>
                                                    <p className="text-[8px] text-white/30 font-bold">{p.curCount || 0} прод.</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profit Dynamics */}
                    <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                            <div>
                                <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Денежные потоки</h2>
                                <p className="text-white/30 text-xs font-manrope">Сравнение доходов и расходов за последние 8 дней</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-sparta-gold rounded-full" />
                                    <span className="text-[10px] text-white/50 font-black uppercase tracking-tighter">Выручка</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <span className="text-[10px] text-white/50 font-black uppercase tracking-tighter">Расходы</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} dy={15} />
                                    <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                                        <p className="text-[10px] uppercase font-black text-white/40 mb-2 tracking-widest">{label}</p>
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                                                                <span className="text-[11px] font-bold text-white/60">{entry.name}:</span>
                                                                <span className="text-sm font-russo" style={{ color: entry.stroke }}>{Math.round(entry.value).toLocaleString()} ₽</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="Выручка" stroke="#d4af37" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="Расходы" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sales Funnel */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="mb-10 text-center">
                            <h2 className="text-2xl font-russo text-white uppercase tracking-wider">От заявки до оплаты</h2>
                            <p className="text-white/30 text-xs font-manrope">Как превращаются потенциальные клиенты в реальных</p>
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <FunnelChart>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    />
                                    <Funnel
                                        dataKey="value"
                                        data={stats.funnelData}
                                        isAnimationActive
                                    >
                                        <LabelList position="right" fill="#ffffff50" stroke="none" dataKey="name" fontSize={10} fontWeight="bold" />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Сквозная конверсия</p>
                                <p className="text-xl font-russo text-sparta-gold">
                                    {requests.length > 0 ? Math.round((requests.filter(r => r.status === 'completed').length / requests.length) * 100) : 0}%
                                </p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Скорость обработки</p>
                                <p className="text-xl font-russo text-white tracking-tighter">~4.5ч</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Efficiency Section */}
            <div className="grid grid-cols-1 gap-8 mt-12">
                <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                                <Users2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Работа тренеров</h2>
                                {stats.leader && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Trophy size={12} className="text-sparta-gold" />
                                        <span className="text-[9px] text-sparta-gold font-bold uppercase tracking-widest">Лидер месяца: {stats.leader.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative">
                            {isDirectorOrDev && (
                                <button
                                    onClick={handleGlobalReset}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest text-[10px] font-black mr-2 active:scale-95 shadow-lg shadow-red-500/5 group"
                                >
                                    <X size={14} className="group-hover:rotate-90 transition-transform" />
                                    Сбросить сезон
                                </button>
                            )}
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all uppercase tracking-widest text-[10px] font-black ${isFilterOpen ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                            >
                                <Filter size={14} />
                                {coachSortBy === 'revenue' ? 'По выручке' : coachSortBy === 'rating' ? 'По рейтингу' : coachSortBy === 'students' ? 'По ученикам' : 'По загрузке'}
                            </button>

                            <AnimatePresence>
                                {isFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-[1.5rem] shadow-2xl p-2 z-50 overflow-hidden"
                                    >
                                        {[
                                            { id: 'revenue', label: 'По выручке', icon: Wallet },
                                            { id: 'rating', label: 'По рейтингу', icon: Flame },
                                            { id: 'students', label: 'По ученикам', icon: Users },
                                            { id: 'efficiency', label: 'По загрузке', icon: BarChart3 },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    setCoachSortBy(opt.id as any);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coachSortBy === opt.id ? 'bg-sparta-gold/10 text-sparta-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <opt.icon size={14} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] text-white/20 uppercase font-black tracking-widest border-b border-white/5">
                                    <th className="text-left pb-4 pl-4 uppercase">Тренер</th>
                                    <th className="text-center pb-4 uppercase">Группы</th>
                                    <th className="text-center pb-4 uppercase">Ученики</th>
                                    <th className="text-center pb-4 uppercase">Загрузка</th>
                                    <th className="text-center pb-4 uppercase">Выручка</th>
                                    <th className="text-right pb-4 pr-4 uppercase">Рейтинг</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.coachStats.map((coach, idx) => (
                                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-5 pl-4 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-russo text-sparta-gold text-lg overflow-hidden relative">
                                                {coach.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-white font-bold font-manrope">{coach.name}</span>
                                                <span className="text-[10px] text-white/30 uppercase font-black tracking-tighter">Наставник клуба</span>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <span className="text-sm text-white/80 font-black">{coach.groups}</span>
                                        </td>
                                        <td className="py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-russo text-white">{coach.students}</span>
                                                    {coach.delta > 0 && (
                                                        <span className="text-[9px] text-emerald-400 font-black">+{coach.delta}</span>
                                                    )}
                                                </div>
                                                <div className="w-12 h-0.5 bg-white/5 mt-1 rounded-full overflow-hidden">
                                                    <div className="h-full bg-sparta-gold" style={{ width: `${Math.min(100, (coach.students / 40) * 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                                                <Flame size={12} className={Number(coach.efficiency) > 80 ? 'text-orange-500' : 'text-blue-400'} />
                                                <span className="text-[11px] font-black text-white">{coach.efficiency}%</span>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center">
                                            <span className="text-sm font-bold text-emerald-400">{Math.round(coach.revenue).toLocaleString()} ₽</span>
                                        </td>
                                        <td className="py-5 pr-4 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sparta-gold font-russo text-sm">★</span>
                                                    <span className="text-sm text-white font-bold">{coach.rating}</span>
                                                </div>
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[7px] text-white/40 uppercase">Пос</span>
                                                        <span className="text-[9px] text-blue-400 font-bold">{coach.metrics.attendance}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center border-l border-white/10 pl-1.5">
                                                        <span className="text-[7px] text-white/40 uppercase">Поп</span>
                                                        <span className="text-[9px] text-sparta-gold font-bold">{coach.metrics.popularity}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center border-l border-white/10 pl-1.5">
                                                        <span className="text-[7px] text-white/40 uppercase">Уд</span>
                                                        <span className="text-[9px] text-purple-400 font-bold">{coach.metrics.retention}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Expense Analysis Section */}
            {isDirectorOrDev && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-12 mb-20">
                    <div className="xl:col-span-2 bg-[#111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                        <div className="flex flex-col gap-6 mb-8">
                            {/* Top: Title & Main Button */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400 shrink-0">
                                        <TrendingUp size={24} className="rotate-180" />
                                    </div>
                                    <h2 className="text-2xl font-russo text-white uppercase tracking-wider">История расходов</h2>
                                </div>

                                <button
                                    onClick={() => setIsExpenseModalOpen(true)}
                                    className="w-full sm:w-auto p-3 px-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 group active:scale-95"
                                >
                                    <ArrowUp size={14} className="rotate-45" />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Записать расход</span>
                                </button>
                            </div>

                            {/* Middle: Filters & Mini-Stats */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-4 border-t border-white/5">
                                <div className="flex flex-wrap gap-2">
                                    {['all', 'rent', 'salaries', 'marketing', 'equipment', 'utility', 'other'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setExpenseFilter(cat)}
                                            className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all ${expenseFilter === cat ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}
                                        >
                                            {cat === 'all' ? 'Все' : cat === 'rent' ? 'Аренда' : cat === 'salaries' ? 'З/П' : cat === 'marketing' ? 'МКТ' : cat === 'equipment' ? 'Обор' : cat === 'utility' ? 'Ком' : 'Прочее'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 w-full lg:w-auto mt-2 lg:mt-0">
                                    <div className="flex-1 lg:flex-none bg-white/5 border border-white/5 rounded-2xl p-3 px-4 min-w-[120px]">
                                        <p className="text-[8px] text-white/20 uppercase font-black mb-1">Затраты %</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-russo ${stats.efficiencyIndex && stats.efficiencyIndex > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {stats.efficiencyIndex ? `${Math.round(stats.efficiencyIndex)}%` : 'Н/Д'}
                                            </span>
                                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden shrink-0">
                                                <div className={`h-full ${stats.efficiencyIndex && stats.efficiencyIndex > 70 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${stats.efficiencyIndex ? Math.min(100, stats.efficiencyIndex) : 0}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    {stats.topExpenseCategory && (
                                        <div className="flex-1 lg:flex-none bg-white/5 border border-white/5 rounded-2xl p-3 px-4">
                                            <p className="text-[8px] text-white/20 uppercase font-black mb-1">Топ статья</p>
                                            <span className="text-sm font-russo text-sparta-gold uppercase whitespace-nowrap">
                                                {stats.topExpenseCategory.name === 'rent' ? 'Аренда' :
                                                    stats.topExpenseCategory.name === 'salaries' ? 'Зарплаты' :
                                                        stats.topExpenseCategory.name === 'marketing' ? 'Маркетинг' :
                                                            stats.topExpenseCategory.name === 'equipment' ? 'Оборудование' :
                                                                stats.topExpenseCategory.name === 'utility' ? 'Коммунальные' : 'Прочее'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {stats.recentExpenses
                                .filter(exp => expenseFilter === 'all' || exp.category === expenseFilter)
                                .slice(0, 10)
                                .map((exp, idx) => {
                                    const Icon = exp.category === 'rent' ? Home :
                                        exp.category === 'salaries' ? Banknote :
                                            exp.category === 'marketing' ? Megaphone :
                                                exp.category === 'equipment' ? Wrench :
                                                    exp.category === 'utility' ? UtilityIcon : MoreHorizontal;

                                    return (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                                    <Icon size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white font-bold">{exp.description || 'Без описания'}</span>
                                                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">
                                                        {exp.category === 'rent' ? 'Аренда' :
                                                            exp.category === 'salaries' ? 'Зарплаты' :
                                                                exp.category === 'marketing' ? 'Маркетинг' :
                                                                    exp.category === 'equipment' ? 'Оборудование' :
                                                                        exp.category === 'utility' ? 'Коммунальные' : 'Прочее'
                                                        } • {format(exp.date?.toDate() || new Date(), 'dd MMMM', { locale: ru })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-lg font-russo text-red-500">-{Math.round(exp.amount).toLocaleString()} ₽</span>
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            {stats.recentExpenses.filter(exp => expenseFilter === 'all' || exp.category === expenseFilter).length === 0 && (
                                <p className="text-white/20 text-center py-10 font-manrope">В этой категории расходов нет</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold">
                                <PieChartIcon size={24} />
                            </div>
                            <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Структура</h2>
                        </div>

                        <div className="h-[250px] w-full mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.expenseData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {stats.expenseData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const entry: any = payload[0];
                                                const rawVal: number = Number(entry?.value) || 0;
                                                const totalSum: number = (stats.expenseData || []).reduce((acc: number, x: any) => acc + (Number(x?.value) || 0), 0) || 1;
                                                return (
                                                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                                        <p className="text-[10px] uppercase font-black text-white/40 mb-2 tracking-widest">
                                                            {entry.name === 'rent' ? 'Аренда' :
                                                                entry.name === 'salaries' ? 'Зарплаты' :
                                                                    entry.name === 'marketing' ? 'Маркетинг' :
                                                                        entry.name === 'equipment' ? 'Оборудование' :
                                                                            entry.name === 'utility' ? 'Коммунальные' : 'Прочее'}
                                                        </p>
                                                        <p className="text-lg font-russo text-white">{Math.round(rawVal).toLocaleString()} ₽</p>
                                                        <p className="text-[9px] text-sparta-gold font-bold mt-1">
                                                            {Math.round((rawVal / totalSum) * 100)}% от всех расходов
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-4">
                            {stats.expenseData.map((d, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[11px] text-white/50 uppercase font-black tracking-widest">
                                            {d.name === 'rent' ? 'Аренда' :
                                                d.name === 'salaries' ? 'Зарплаты' :
                                                    d.name === 'marketing' ? 'Маркетинг' :
                                                        d.name === 'equipment' ? 'Оборудование' :
                                                            d.name === 'utility' ? 'Коммунальные' : 'Прочее'
                                            }
                                        </span>
                                    </div>
                                    <span className="text-sm font-russo text-white">{Math.round((d.value / stats.expenseData.reduce((acc, x) => acc + x.value, 0)) * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Expense Modal */}
            <AnimatePresence>
                {isExpenseModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExpenseModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Новый расход</h3>
                                <button
                                    onClick={() => setIsExpenseModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddExpense} className="space-y-6">
                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Сумма (₽)</label>
                                    <input
                                        type="number"
                                        required
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-russo text-white focus:border-red-500/50 outline-none transition-all placeholder:text-white/5"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Категория</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="rent" className="bg-[#111] text-white">Аренда</option>
                                        <option value="salaries" className="bg-[#111] text-white">Зарплаты</option>
                                        <option value="equipment" className="bg-[#111] text-white">Оборудование</option>
                                        <option value="marketing" className="bg-[#111] text-white">Маркетинг</option>
                                        <option value="utility" className="bg-[#111] text-white">Коммуналка</option>
                                        <option value="other" className="bg-[#111] text-white">Прочее</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Описание</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={expenseDescription}
                                        onChange={(e) => {
                                            const text = e.target.value;
                                            setExpenseDescription(text);
                                            const lower = text.toLowerCase();
                                            if (lower.includes('аренда') || lower.includes('помещ') || lower.includes('зал')) setExpenseCategory('rent');
                                            else if (lower.includes('зарплат') || lower.includes('зп') || lower.includes('выплат') || lower.includes('тренер')) setExpenseCategory('salaries');
                                            else if (lower.includes('реклам') || lower.includes('маркетинг') || lower.includes('таргет') || lower.includes('лид')) setExpenseCategory('marketing');
                                            else if (lower.includes('свет') || lower.includes('вода') || lower.includes('интернет') || lower.includes('коммун')) setExpenseCategory('utility');
                                            else if (lower.includes('мяч') || lower.includes('форм') || lower.includes('инвент') || lower.includes('ремонт') || lower.includes('обор')) setExpenseCategory('equipment');
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:border-red-500/50 outline-none transition-all placeholder:text-white/5"
                                        placeholder="На что потрачено..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-russo uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-red-500/20 active:scale-95"
                                >
                                    Сохранить расход
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* System Controls - Director/Dev Only */}
            {isDirectorOrDev && (
                <div className="mt-20 pt-10 border-t border-white/5">
                    <div className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full" />

                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                                    <UtilityIcon size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-russo text-white uppercase">Управление данными</h2>
                                    <p className="text-white/40 text-sm font-manrope">Сброс статистики, очистка кэша и системные настройки</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={handleGlobalReset}
                                    className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-red-500/20 active:scale-95 flex items-center gap-3"
                                >
                                    <X size={18} />
                                    Сбросить статистику сезона
                                </button>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                                    Последний сброс: {statsResetDate.getTime() > 0 ? format(statsResetDate, 'dd MMMM yyyy, HH:mm', { locale: ru }) : 'Не проводился'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Students Explorer Modal */}
            <AnimatePresence>
                {isNewStudentsExplorerOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsNewStudentsExplorerOpen(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-6xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold border border-sparta-gold/20">
                                        <Users2 size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Реестр новых учеников</h2>
                                        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">
                                            {stats?.currentUsers?.length || 0} регистраций за выбранный период
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="flex-1 md:w-64 relative">
                                        <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                        <select
                                            value={newStudentsFilterGroup}
                                            onChange={(e) => setNewStudentsFilterGroup(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-sparta-gold/50 appearance-none cursor-pointer"
                                        >
                                            <option value="all" className="bg-[#111]">Все группы</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id} className="bg-[#111]">{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => setIsNewStudentsExplorerOpen(false)}
                                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content - Table */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] text-white/30 uppercase font-black tracking-widest border-b border-white/5">
                                            <th className="pb-4 pl-4">Ученик</th>
                                            <th className="pb-4 text-center">Группа</th>
                                            <th className="pb-4 text-center">Контакты</th>
                                            <th className="pb-4 text-center">Баланс</th>
                                            <th className="pb-4 text-right pr-4">Дата регистрации</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stats?.currentUsers
                                            ?.filter(u => newStudentsFilterGroup === 'all' || u.groupId === newStudentsFilterGroup)
                                            .map((user: any, idx: number) => (
                                                <motion.tr
                                                    key={user.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="group hover:bg-white/[0.02] cursor-pointer"
                                                    onClick={() => setSelectedStudentId(user.id)}
                                                >
                                                    <td className="py-5 pl-4 flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-russo text-white/40 text-lg uppercase group-hover:text-sparta-gold group-hover:border-sparta-gold/30 transition-all">
                                                            {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-white font-bold font-manrope">{user.displayName || 'Без имени'}</span>
                                                            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">UID: {user.id.slice(0, 8)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 text-center">
                                                        <div className="inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/60 group-hover:text-white group-hover:bg-white/10 transition-all">
                                                            {groups.find(g => g.id === user.groupId)?.name || 'Нет группы'}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <span className="text-[11px] text-white/80 font-bold">{user.email}</span>
                                                            <span className="text-[9px] text-white/20">{user.phoneNumber || 'Телефон не указан'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 text-center">
                                                        <span className={`text-sm font-russo ${(user.walletBalance || 0) > 0 ? 'text-emerald-400' : 'text-white/20'}`}>
                                                            {(user.walletBalance || 0).toLocaleString()} ₽
                                                        </span>
                                                    </td>
                                                    <td className="py-5 text-right pr-4">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs text-white/60 font-medium">
                                                                {format(user.createdAt?.toDate?.() || new Date(0), 'dd MMM yyyy', { locale: ru })}
                                                            </span>
                                                            <span className="text-[9px] text-white/20 uppercase font-black">
                                                                {format(user.createdAt?.toDate?.() || new Date(0), 'HH:mm', { locale: ru })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                    </tbody>
                                </table>
                                {(!stats?.currentUsers || stats.currentUsers.length === 0) && (
                                    <div className="py-20 flex flex-col items-center justify-center text-white/20">
                                        <Users size={48} className="mb-4 opacity-20" />
                                        <p className="font-russo uppercase tracking-widest">Нет новых регистраций</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-[#0c0c0c] border-t border-white/5 flex justify-end gap-4">
                                <button
                                    onClick={() => setIsNewStudentsExplorerOpen(false)}
                                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                                >
                                    Закрыть инструменты
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Student Profile Peek Modal */}
            <AnimatePresence>
                {selectedStudentId && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedStudentId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            {(() => {
                                const user = users.find(u => u.id === selectedStudentId);
                                if (!user) return null;
                                return (
                                    <div className="p-8 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-3xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center font-russo text-sparta-gold text-2xl">
                                                    {user.displayName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-russo text-white uppercase tracking-wider">{user.displayName || 'Новый ученик'}</h3>
                                                    <p className="text-sparta-gold/60 text-[10px] uppercase font-black tracking-widest">Профиль клиента</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedStudentId(null)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Группа</p>
                                                <p className="text-xs font-bold text-white">{groups.find(g => g.id === user.groupId)?.name || 'Не присвоена'}</p>
                                            </div>
                                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Баланс кошелька</p>
                                                <p className="text-xs font-bold text-emerald-400">{(user.walletBalance || 0).toLocaleString()} ₽</p>
                                            </div>
                                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Email</p>
                                                <p className="text-[11px] font-medium text-white/60 truncate">{user.email}</p>
                                            </div>
                                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Регистрация</p>
                                                <p className="text-xs font-bold text-white/80">{format(user.createdAt?.toDate?.() || new Date(), 'dd.MM.yyyy')}</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex flex-col gap-3">
                                            <a
                                                href={`mailto:${user.email}`}
                                                className="w-full py-4 bg-sparta-gold/10 hover:bg-sparta-gold/20 border border-sparta-gold/20 text-sparta-gold rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all"
                                            >
                                                <Megaphone size={14} />
                                                Связаться почтой
                                            </a>
                                            <button
                                                onClick={() => {
                                                    setSelectedStudentId(null);
                                                    setIsNewStudentsExplorerOpen(false);
                                                    // This could navigate to a dedicated user edit page if we had one
                                                    window.location.href = `/admin/users?edit=${user.id}`;
                                                }}
                                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all"
                                            >
                                                <Eye size={14} />
                                                Управление аккаунтом
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DirectorDashboard;