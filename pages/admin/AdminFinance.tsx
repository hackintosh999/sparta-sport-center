import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    TrendingUp,
    ShoppingBag,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Filter,
    Download,
    PieChart as PieChartIcon,
    BarChart3,
    Activity,
    Users,
    ChevronDown,
    Search,
    RefreshCw,
    Trash2,
    Check,
    X,
    FileText,
    Target,
    Zap,
    History,
    Eye,
    EyeOff
} from 'lucide-react';
import { deleteDoc, doc, writeBatch, getDocs, addDoc } from 'firebase/firestore';

import { format, subDays, startOfDay, endOfDay, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const COLORS = ['#34d399', '#a855f7', '#3b82f6', '#f59e0b'];

interface Transaction {
    id: string;
    amount: number;
    netAmount: number;
    commission: number;
    type: 'subscription' | 'shop_order' | 'topup' | 'other';
    date: Date;
    duration?: number;
    userName?: string;
    userEmail?: string;
    status: string;
    method: string;
    details?: string | any[];
}

interface Expense {
    id: string;
    amount: number;
    category: 'rent' | 'salaries' | 'equipment' | 'marketing' | 'utility' | 'other';
    date: Date;
    description: string;
}

const AdminFinance = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
    const [cleanupMonths, setCleanupMonths] = useState(6);
    const [revenueGoal, setRevenueGoal] = useState(500000); // Default goal
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [showAllStatuses, setShowAllStatuses] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [useRealMoneyOnly, setUseRealMoneyOnly] = useState(true);
    const [expenseCategory, setExpenseCategory] = useState<string>('other');
    const [expenseDescription, setExpenseDescription] = useState('');

    const currentDay = new Date().getDate() || 1;
    const daysInMonth = endOfMonth(new Date()).getDate();

    useEffect(() => {
        setLoading(true);
        let ordersMap = new Map<string, Transaction>();
        let shopMap = new Map<string, Transaction>();

        const updateAll = () => {
            const combined = [...Array.from(ordersMap.values()), ...Array.from(shopMap.values())];
            setTransactions(combined.sort((a, b) => b.date.getTime() - a.date.getTime()));
            setLoading(false);
        };

        const qOrders = query(collection(db, 'orders'), orderBy('date', 'desc'));
        const qShop = query(collection(db, 'shop_orders'), orderBy('createdAt', 'desc'));
        const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));

        const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    const data = change.doc.data();
                    const rawAmount = data.totalAmount || data.price || data.amount || 0;
                    const method = data.paymentMethod || 'other';
                    let commissionRate = 0;
                    if (method === 'robokassa') commissionRate = 0.039;
                    if (method === 'yookassa') commissionRate = 0.035;
                    const commission = rawAmount * commissionRate;

                    ordersMap.set(change.doc.id, {
                        id: change.doc.id,
                        amount: rawAmount,
                        netAmount: rawAmount - commission,
                        commission,
                        type: data.type || 'other',
                        date: data.date?.toDate() || data.createdAt?.toDate() || new Date(),
                        duration: data.duration,
                        userName: data.userName,
                        userEmail: data.email || data.userEmail,
                        status: data.status,
                        method,
                        details: data.planTitle || data.items || null
                    });
                }
                if (change.type === "removed") ordersMap.delete(change.doc.id);
            });
            updateAll();
        }, (error) => {
            console.error("Orders Snapshot Error:", error);
            setLoading(false);
        });

        const unsubscribeShop = onSnapshot(qShop, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" || change.type === "modified") {
                    const data = change.doc.data();
                    const rawAmount = data.totalAmount || 0;
                    const method = data.paymentMethod || 'robokassa';
                    let commissionRate = 0;
                    if (method === 'robokassa') commissionRate = 0.039;
                    if (method === 'yookassa') commissionRate = 0.035;
                    const commission = rawAmount * commissionRate;

                    shopMap.set(change.doc.id, {
                        id: change.doc.id,
                        amount: rawAmount,
                        netAmount: rawAmount - commission,
                        commission,
                        type: 'shop_order' as const,
                        date: data.createdAt?.toDate() || new Date(),
                        userName: data.customerName,
                        userEmail: data.email,
                        status: data.status,
                        method,
                        details: data.items || null
                    });
                }
                if (change.type === "removed") shopMap.delete(change.doc.id);
            });
            updateAll();
        }, (error) => {
            console.error("Shop Snapshot Error:", error);
            setLoading(false);
        });

        const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
            const expData: Expense[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate() || new Date()
            })) as Expense[];
            setExpenses(expData);
        }, (error) => {
            console.error("Expenses Snapshot Error:", error);
        });

        return () => {
            unsubscribeOrders();
            unsubscribeShop();
            unsubscribeExpenses();
        };
    }, []);

    // --- Analytics Logic ---
    const filteredTransactions = useMemo(() => {
        let result = transactions.filter(t => {
            const matchesSearch = t.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.id.includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || t.type === selectedCategory;
            const statusFilter = showAllStatuses ? true : t.status === 'completed';
            return matchesSearch && matchesCategory && statusFilter;
        });

        // Apply advanced sorting
        result.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal === undefined || bVal === undefined) return 0;

            if (sortConfig.key === 'date') {
                return sortConfig.direction === 'asc'
                    ? (aVal as Date).getTime() - (bVal as Date).getTime()
                    : (bVal as Date).getTime() - (aVal as Date).getTime();
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, searchTerm, selectedCategory, showAllStatuses, sortConfig]);

    const stats = useMemo(() => {
        const now = new Date();
        const allCompleted = transactions.filter(t => t.status === 'completed');

        // Filter for "Real Money" if enabled
        const completed = useRealMoneyOnly
            ? allCompleted.filter(t => t.method !== 'balance' && t.method !== 'wallet')
            : allCompleted;

        // All-Time Revenue
        const totalGross = completed.reduce((acc, curr) => acc + curr.amount, 0);
        const totalNet = completed.reduce((acc, curr) => acc + (curr.netAmount !== undefined ? curr.netAmount : curr.amount), 0);
        const totalCommissions = completed.reduce((acc, curr) => acc + (curr.commission || 0), 0);

        // Using Net amounts for breakdown
        const subRev = completed.filter(t => t.type === 'subscription').reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);
        const shopRev = completed.filter(t => t.type === 'shop_order').reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);
        const topupRev = completed.filter(t => t.type === 'topup').reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);

        // Period definitions
        const start = period === 'week' ? subDays(now, 7) : (period === 'month' ? startOfMonth(now) : startOfMonth(subMonths(now, 11)));
        const end = now;
        const daysInPeriod = period === 'week' ? 7 : (period === 'month' ? currentDay : 365);

        // Previous period for trends
        const prevStart = period === 'week' ? subDays(now, 14) : (period === 'month' ? subMonths(now, 2) : subMonths(now, 24));
        const prevEnd = period === 'week' ? subDays(now, 7) : (period === 'month' ? subMonths(now, 1) : subMonths(now, 12));

        const prevTransactions = completed.filter(t => t.date >= prevStart && t.date <= prevEnd);
        const prevTotal = prevTransactions.reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);

        const trend = prevTotal > 0 ? Math.round(((totalNet - prevTotal) / prevTotal) * 100) : 100;

        // Today's snapshot
        const today = startOfDay(new Date());
        const todayTrans = completed.filter(t => t.date >= today);
        const todayRevenue = todayTrans.reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);
        const todayCount = todayTrans.length;

        // MTD Comparison (Month-to-Date)
        const currentMonthStart = startOfMonth(now);
        const currentMTDTotal = completed.filter(t => t.date >= currentMonthStart && t.date <= now).reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);

        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthSameDay = subMonths(now, 1);
        const lastMonthMTDTotal = completed.filter(t => t.date >= lastMonthStart && t.date <= lastMonthSameDay).reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);

        const mtdGrowth = lastMonthMTDTotal > 0 ? Math.round(((currentMTDTotal - lastMonthMTDTotal) / lastMonthMTDTotal) * 100) : 0;

        // 4. Run Rate (Forecast for EOM)
        const runRate = Math.round((currentMTDTotal / (currentDay || 1)) * daysInMonth);

        // 3. Accrual Accounting (Current Month)
        let currentMonthAccrual = 0;
        completed.forEach(t => {
            const netAmt = t.netAmount !== undefined ? t.netAmount : t.amount;
            if (t.type === 'subscription') {
                const dur = t.duration || 1;
                const monthlyAmt = netAmt / dur;
                const subStart = startOfMonth(t.date);
                const subEnd = new Date(subStart);
                subEnd.setMonth(subEnd.getMonth() + dur);
                if (currentMonthStart >= subStart && currentMonthStart < subEnd) {
                    currentMonthAccrual += monthlyAmt;
                }
            } else if (t.date >= currentMonthStart && t.date <= now) {
                currentMonthAccrual += netAmt;
            }
        });
        currentMonthAccrual = Math.round(currentMonthAccrual);

        // 5. Margin Details Data (LTV, CAC, Gross Margin)
        const uniqueEmails = new Set(completed.map(t => t.userEmail).filter(Boolean));
        const uniqueCustomersCount = uniqueEmails.size;
        const ltv = uniqueCustomersCount > 0 ? Math.round(totalNet / uniqueCustomersCount) : 0;

        const allMarketingExp = expenses.filter(e => e.category === 'marketing').reduce((acc, curr) => acc + curr.amount, 0);
        const cac = uniqueCustomersCount > 0 ? Math.round(allMarketingExp / uniqueCustomersCount) : 0;

        // Expenses
        const periodExpenses = expenses.filter(e => e.date >= start && e.date <= end);
        const totalExpenses = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        const periodTransArr = completed.filter(t => t.date >= start && t.date <= end);
        const periodNetTotal = periodTransArr.reduce((acc, curr) => acc + (curr.netAmount || curr.amount), 0);

        const netProfit = periodNetTotal - totalExpenses;
        const grossMargin = periodNetTotal > 0 ? Math.round((netProfit / periodNetTotal) * 100) : 0;

        const burnRate = Math.round(totalExpenses / (daysInPeriod || 1));

        // Retention Rate (Still using allCompleted to track customer loyalty regardless of payment method)
        const currentMonthUsers = new Set(allCompleted.filter(t => t.date >= currentMonthStart).map(t => t.userEmail).filter(Boolean));
        const lastMonthUsers = new Set(allCompleted.filter(t => t.date >= lastMonthStart && t.date <= lastMonthSameDay).map(t => t.userEmail).filter(Boolean));

        let returningCount = 0;
        lastMonthUsers.forEach(email => {
            if (currentMonthUsers.has(email)) returningCount++;
        });
        const retentionRate = lastMonthUsers.size > 0 ? Math.round((returningCount / lastMonthUsers.size) * 100) : 0;

        // Expense breakdown
        const expBreakdown: Record<string, number> = {};
        periodExpenses.forEach(e => {
            expBreakdown[e.category] = (expBreakdown[e.category] || 0) + e.amount;
        });
        const expenseBreakdown = Object.entries(expBreakdown)
            .map(([name, value]) => ({
                name: name === 'rent' ? 'Аренда' :
                    name === 'salaries' ? 'Зарплаты' :
                        name === 'equipment' ? 'Оборудование' :
                            name === 'marketing' ? 'Маркетинг' :
                                name === 'utility' ? 'Коммуналка' : 'Прочее',
                value
            }))
            .sort((a, b) => b.value - a.value);

        // Top Performers calculation (Using allCompleted to show popular items even if paid by balance)
        const programs: Record<string, { revenue: number, count: number }> = {};
        const shopItems: Record<string, { revenue: number, count: number }> = {};
        const topups: Record<string, { revenue: number, count: number }> = {};
        const customers: Record<string, { revenue: number, name: string }> = {};

        allCompleted.forEach(t => {
            const isReal = useRealMoneyOnly ? (t.method !== 'balance' && t.method !== 'wallet') : true;
            if (t.type === 'subscription' && typeof t.details === 'string') {
                if (!programs[t.details]) programs[t.details] = { revenue: 0, count: 0 };
                // We show revenue part only if it's real money for consistency with "total"?
                // Actually, programs/shopItems are "rankings". Usually we want to see what is SELLING best.
                // But if the user wants "finances" to be real money, let's keep revenue fields as real money.
                if (isReal) programs[t.details].revenue += t.amount;
                programs[t.details].count += 1;
            }
            if (t.type === 'shop_order' && Array.isArray(t.details)) {
                t.details.forEach((item: any) => {
                    const title = item.title || 'Unknown Item';
                    if (!shopItems[title]) shopItems[title] = { revenue: 0, count: 0 };
                    if (isReal) shopItems[title].revenue += (item.price * item.quantity) || 0;
                    shopItems[title].count += item.quantity || 1;
                });
            }
            if (t.type === 'topup' && isReal) {
                const method = t.method || 'Other';
                if (!topups[method]) topups[method] = { revenue: 0, count: 0 };
                topups[method].revenue += t.amount;
                topups[method].count += 1;
            }
            const customerKey = t.userEmail || t.id;
            if (!customers[customerKey]) customers[customerKey] = { revenue: 0, name: t.userName || t.userEmail || 'Аноним' };
            if (isReal) customers[customerKey].revenue += t.amount;
        });

        const topPrograms = Object.entries(programs).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue || b.count - a.count).slice(0, 5);
        const topShopItems = Object.entries(shopItems).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue || b.count - a.count).slice(0, 5);
        const topCustomers = Object.entries(customers).map(([email, data]) => ({ email, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        // Income breakdown (Calculated from REAL money inflows)
        const incomeBreakdown = [
            { name: 'Абонементы', value: subRev },
            { name: 'Магазин', value: shopRev },
            { name: 'Пополнения', value: topupRev }
        ].filter(item => item.value > 0);

        return {
            total: totalNet,
            totalGross,
            totalNet,
            totalCommissions,
            subRev,
            shopRev,
            topupRev,
            trend,
            todayRevenue,
            todayCount,
            currentMTDTotal,
            mtdGrowth,
            totalExpenses,
            netProfit,
            burnRate,
            retentionRate,
            incomeBreakdown,
            expenseBreakdown,
            topPrograms,
            topShopItems,
            topCustomers,
            runRate,
            currentMonthAccrual,
            ltv,
            cac,
            grossMargin
        };
    }, [transactions, expenses, period, useRealMoneyOnly]);

    const chartData = useMemo(() => {
        const now = new Date();
        let days = period === 'week' ? 7 : (period === 'month' ? 30 : 365);
        const data = [];

        // Filter for real money dynamics if enabled
        const baseTransactions = filteredTransactions.filter(t => t.status === 'completed');
        const analyticsTransactions = useRealMoneyOnly
            ? baseTransactions.filter(t => t.method !== 'balance' && t.method !== 'wallet')
            : baseTransactions;

        for (let i = days; i >= 0; i--) {
            const date = subDays(now, i);
            const label = i === 0 ? 'Сегодня' : format(date, period === 'year' ? 'MMM' : 'dd MMM', { locale: ru });

            const dayTransactions = analyticsTransactions.filter(t =>
                isWithinInterval(t.date, { start: startOfDay(date), end: endOfDay(date) })
            );

            const revenue = dayTransactions.reduce((acc, curr) => acc + curr.amount, 0);

            // For year view, group by month
            if (period === 'year') {
                const monthLabel = format(date, 'MMM', { locale: ru });
                const existing = data.find(d => d.name === monthLabel);
                if (existing) {
                    existing.revenue += revenue;
                } else {
                    data.push({ name: monthLabel, revenue });
                }
            } else {
                data.push({ name: label, revenue });
            }
        }
        return data;
    }, [filteredTransactions, period, useRealMoneyOnly]);

    const pieData = [
        { name: 'Абонементы', value: stats.subRev },
        { name: 'Магазин', value: stats.shopRev },
        { name: 'Пополнения', value: stats.topupRev },
        { name: 'Другое', value: stats.total - (stats.subRev + stats.shopRev + stats.topupRev) }
    ].filter(d => d.value > 0);

    const handleClearAll = async () => {
        try {
            setLoading(true);
            const collections = ["orders", "shop_orders", "expenses"];

            for (const collName of collections) {
                const snap = await getDocs(collection(db, collName));
                if (snap.empty) continue;

                // Delete in chunks of 500
                const docs = snap.docs;
                for (let i = 0; i < docs.length; i += 500) {
                    const batch = writeBatch(db);
                    const chunk = docs.slice(i, i + 500);
                    chunk.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }

            setIsClearModalOpen(false);
            setLoading(false);
            alert("Все транзакции и расходы удалены");
        } catch (error) {
            console.error("Error clearing transactions:", error);
            setLoading(false);
            alert("Ошибка при удалении данных");
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm("Вы уверены, что хотите удалить этот расход?")) return;
        try {
            await deleteDoc(doc(db, 'expenses', id));
        } catch (error) {
            console.error("Error deleting expense:", error);
            alert("Ошибка при удалении расхода");
        }
    };

    const handleSmartCleanup = async (months: number) => {
        try {
            setLoading(true);
            const cutoffDate = subMonths(new Date(), months);

            // Orders
            const ordersSnap = await getDocs(query(collection(db, "orders"), where("date", "<", Timestamp.fromDate(cutoffDate))));
            if (!ordersSnap.empty) {
                const docs = ordersSnap.docs;
                for (let i = 0; i < docs.length; i += 500) {
                    const batch = writeBatch(db);
                    docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }

            // Shop Orders
            const shopOrdersSnap = await getDocs(query(collection(db, "shop_orders"), where("createdAt", "<", Timestamp.fromDate(cutoffDate))));
            if (!shopOrdersSnap.empty) {
                const docs = shopOrdersSnap.docs;
                for (let i = 0; i < docs.length; i += 500) {
                    const batch = writeBatch(db);
                    docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }

            // Expenses Cleanup
            const expensesSnap = await getDocs(query(collection(db, "expenses"), where("date", "<", Timestamp.fromDate(cutoffDate))));
            if (!expensesSnap.empty) {
                const docs = expensesSnap.docs;
                for (let i = 0; i < docs.length; i += 500) {
                    const batch = writeBatch(db);
                    docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }

            setIsCleanupModalOpen(false);
            setLoading(false);
            alert(`Старые данные (более ${months} мес.) удалены`);
        } catch (error) {
            console.error("Error cleaning up old transactions:", error);
            setLoading(false);
            alert("Ошибка при очистке данных");
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        try {
            await addDoc(collection(db, 'expenses'), {
                amount: Number(formData.get('amount')),
                category: formData.get('category'),
                description: formData.get('description'),
                date: Timestamp.now()
            });
            setIsExpenseModalOpen(false);
            setExpenseDescription('');
            setExpenseCategory('other');
            form.reset();
        } catch (error) {
            console.error("Error adding expense:", error);
            alert("Ошибка при добавлении расхода");
        }
    };


    const handlePrintReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = format(new Date(), 'dd.MM.yyyy HH:mm');
        const periodStr = period === 'week' ? 'За последние 7 дней' : (period === 'month' ? 'За текущий месяц' : 'За текущий год');

        const transactionsHtml = filteredTransactions.slice(0, 100).map(t => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${t.id.slice(0, 8)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${format(t.date, 'dd.MM.yy HH:mm')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold;">${t.userName || '—'}</div>
                    <div style="font-size: 10px; color: #888;">${t.userEmail || ''}</div>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="type-badge">${t.type}</span></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    <div class="amount">${(t.netAmount || t.amount).toLocaleString()} ₽</div>
                    ${t.commission > 0 ? `<div style="font-size: 9px; color: #ef4444;">-${t.commission.toLocaleString()} ₽ ком.</div>` : ''}
                </td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Sparta Finance Report - ${dateStr}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Russo+One&display=swap');
                        body { 
                            font-family: 'Manrope', sans-serif; 
                            padding: 40px; 
                            color: #1a1a1a; 
                            background: #fff;
                            line-height: 1.5;
                        }
                        .header { 
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            margin-bottom: 40px; 
                            border-bottom: 3px solid #000; 
                            padding-bottom: 20px; 
                        }
                        .logo-text {
                            font-family: 'Russo One', sans-serif;
                            font-size: 28px;
                            color: #000;
                            letter-spacing: 1px;
                            margin-bottom: 5px;
                        }
                        .report-title {
                            text-align: right;
                        }
                        .report-title h2 {
                            margin: 0;
                            font-size: 24px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #000;
                        }
                        .report-subtitle {
                            font-size: 12px;
                            color: #666;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            margin-top: 5px;
                            font-weight: bold;
                        }
                        .summary-box {
                            background: #f8f9fa;
                            border: 1px solid #e9ecef;
                            border-radius: 8px;
                            padding: 24px;
                            margin-bottom: 40px;
                        }
                        .summary-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 20px;
                        }
                        .summary-item {
                            border-left: 3px solid #000;
                            padding-left: 15px;
                        }
                        .summary-item.net { border-color: #10b981; }
                        .summary-item.exp { border-color: #ef4444; }
                        .summary-item.ltv { border-color: #3b82f6; }
                        
                        .summary-label {
                            font-size: 10px;
                            text-transform: uppercase;
                            color: #666;
                            font-weight: 800;
                            letter-spacing: 0.5px;
                            margin-bottom: 5px;
                        }
                        .summary-value {
                            font-size: 22px;
                            font-family: 'Russo One', sans-serif;
                            color: #000;
                        }
                        .summary-subtext {
                            font-size: 10px;
                            color: #888;
                            margin-top: 4px;
                        }
                        
                        h3 { 
                            font-family: 'Russo One', sans-serif; 
                            font-size: 16px; 
                            margin-bottom: 15px; 
                            color: #000;
                            text-transform: uppercase;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 10px;
                        }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        th { 
                            text-align: left; 
                            padding: 10px; 
                            background: #000; 
                            color: #fff;
                            font-size: 10px; 
                            text-transform: uppercase; 
                            letter-spacing: 1px;
                        }
                        td { 
                            padding: 10px; 
                            border-bottom: 1px solid #f0f0f0; 
                            font-size: 12px;
                        }
                        .amount { font-weight: 800; color: #000; font-family: 'Russo One', sans-serif; }
                        .type-badge {
                            font-size: 9px;
                            font-weight: 800;
                            text-transform: uppercase;
                            padding: 3px 8px;
                            border-radius: 4px;
                            background: #eee;
                        }
                        .footer {
                            margin-top: 50px;
                            padding-top: 20px;
                            border-top: 1px solid #eee;
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            color: #888;
                        }
                        .metrics-row {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 20px;
                            margin-bottom: 40px;
                        }
                        .metric-card {
                            border: 1px solid #eee;
                            padding: 15px;
                            border-radius: 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="logo-text">SPARTA SPORTS</div>
                            <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px;">Finance Department</div>
                        </div>
                        <div class="report-title">
                            <h2>Финансовый Отчет</h2>
                            <div class="report-subtitle">${periodStr} • Дата: ${dateStr}</div>
                        </div>
                    </div>
                    
                    <div class="summary-box">
                        <div class="summary-grid">
                            <div class="summary-item">
                                <div class="summary-label">Gross Revenue (Грязная)</div>
                                <div class="summary-value">${stats.totalGross.toLocaleString()} ₽</div>
                                <div class="summary-subtext">Комиссии эквайринга: -${stats.totalCommissions.toLocaleString()} ₽</div>
                            </div>
                            <div class="summary-item net">
                                <div class="summary-label">Net Profit (Чистая прибыль)</div>
                                <div class="summary-value">${stats.netProfit.toLocaleString()} ₽</div>
                                <div class="summary-subtext">Выручка минус расходы (${stats.grossMargin}% маржа)</div>
                            </div>
                            <div class="summary-item exp">
                                <div class="summary-label">Общие расходы</div>
                                <div class="summary-value">${stats.totalExpenses.toLocaleString()} ₽</div>
                                <div class="summary-subtext">В среднем: ${stats.burnRate.toLocaleString()} ₽/день (Burn Rate)</div>
                            </div>
                            <div class="summary-item ltv">
                                <div class="summary-label">Юнит-экономика</div>
                                <div class="summary-value">${stats.ltv.toLocaleString()} / ${stats.cac.toLocaleString()}</div>
                                <div class="summary-subtext">Доход с клиента (LTV) vs Цена привлечения (CAC)</div>
                            </div>
                        </div>
                    </div>

                    <div class="metrics-row">
                        <div class="metric-card">
                            <div class="summary-label">Прогноз на конец месяца</div>
                            <div class="summary-value" style="font-size: 18px;">${stats.runRate.toLocaleString()} ₽</div>
                            <div class="summary-subtext">Ожидаемая сумма к 30 числу (Run Rate)</div>
                        </div>
                        <div class="metric-card">
                            <div class="summary-label">Реальный доход (за месяц)</div>
                            <div class="summary-value" style="font-size: 18px;">${stats.currentMonthAccrual.toLocaleString()} ₽</div>
                            <div class="summary-subtext">Учет авансов и длинных абонементов (Accrual)</div>
                        </div>
                        <div class="metric-card">
                            <div class="summary-label">Удержание клиентов</div>
                            <div class="summary-value" style="font-size: 18px;">${stats.retentionRate}%</div>
                            <div class="summary-subtext">Процент тех, кто вернулся и оплатил снова</div>
                        </div>
                    </div>

                    <h3>Детализация последних банковских транзакций</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>ID транзакции</th>
                                <th>Дата и время</th>
                                <th>Клиент</th>
                                <th>Тип платежа</th>
                                <th style="text-align: right;">Сумма (Net)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>© ${new Date().getFullYear()} Sparta Sports Center. Документ сгенерирован автоматически.</div>
                        <div>Подпись бухгалтера/директора: __________________________</div>
                    </div>

                    <script>
                        window.onload = function() { 
                            setTimeout(() => {
                                window.print(); 
                                window.close(); 
                            }, 800);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <RefreshCw className="animate-spin text-sparta-gold" size={32} />
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20 custom-scrollbar h-[calc(100vh-100px)] overflow-y-auto pr-2"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-russo text-white mb-2">Финансовая аналитика</h1>
                    <p className="text-white/40 text-sm font-manrope">Управление доходами и детализация транзакций</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl mr-2 group">
                        <TrendingUp size={14} className={useRealMoneyOnly ? 'text-sparta-gold' : 'text-white/20'} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Только реальные</span>
                        <button
                            onClick={() => setUseRealMoneyOnly(prev => !prev)}
                            className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${useRealMoneyOnly ? 'bg-sparta-gold' : 'bg-white/10'}`}
                        >
                            <motion.div
                                animate={{ x: useRealMoneyOnly ? 20 : 0 }}
                                className="w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsCleanupModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/5 transition-all text-xs font-bold"
                    >
                        <History size={14} />
                        Очистка
                    </button>
                    <button
                        onClick={() => setIsClearModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/10 transition-all text-xs font-bold"
                    >
                        <Trash2 size={14} />
                        Удалить всё
                    </button>
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all text-sm font-bold"
                    >
                        <Zap size={16} />
                        Добавить расход
                    </button>
                    <button
                        onClick={handlePrintReport}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-all text-sm font-bold"
                    >
                        <Download size={16} />
                        Отчет
                    </button>
                    <div className="flex bg-[#111] p-1 rounded-xl border border-white/5 ml-2">
                        <button onClick={() => setPeriod('week')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === 'week' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>Неделя</button>
                        <button onClick={() => setPeriod('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === 'month' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>Месяц</button>
                        <button onClick={() => setPeriod('year')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${period === 'year' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>Год</button>
                    </div>
                </div>
            </div>

            {/* Today and Goals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today Snapshot */}
                <div className="bg-gradient-to-br from-sparta-gold/20 to-transparent border border-white/5 p-8 rounded-3xl shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all group-hover:scale-110">
                        <Calendar size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-sparta-gold text-black rounded-2xl shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-russo text-white uppercase tracking-wider">Сегодня</h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{format(new Date(), 'dd MMMM yyyy', { locale: ru })}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Выручка</div>
                            <div className="text-3xl font-russo text-white">{stats.todayRevenue.toLocaleString()} ₽</div>
                        </div>
                        <div className="text-right">
                            <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Заказы</div>
                            <div className="text-3xl font-russo text-white">{stats.todayCount}</div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={12} className="text-emerald-400" />
                            Темп дня: {Math.round(stats.todayRevenue / (new Date().getHours() || 1)).toLocaleString()} ₽/час
                        </div>
                    </div>
                </div>

                {/* Monthly Goal Progress */}
                <div className="lg:col-span-2 bg-[#111] border border-white/5 p-8 rounded-3xl relative overflow-hidden group shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/5 rounded-2xl text-white/40 group-hover:text-sparta-gold transition-colors border border-white/5">
                                <Target size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-russo text-white uppercase tracking-wider">Цель на месяц</h3>
                                <p className="text-white/40 text-xs">Прогресс выполнения финансового плана</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Осталось собрать</div>
                            <div className="text-xl font-russo text-white">{Math.max(0, revenueGoal - stats.currentMTDTotal).toLocaleString()} ₽</div>
                            <button
                                onClick={() => {
                                    const newGoal = prompt("Введите новую финансовую цель на месяц:", revenueGoal.toString());
                                    if (newGoal && !isNaN(parseInt(newGoal))) setRevenueGoal(parseInt(newGoal));
                                }}
                                className="text-[10px] text-sparta-gold hover:text-white transition-colors font-bold uppercase tracking-wider mt-1"
                            >
                                Редактировать цель
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-3xl font-russo text-sparta-gold">{Math.min(100, Math.round((stats.currentMTDTotal / revenueGoal) * 100))}%</span>
                            <span className="text-white/20 text-xs font-bold">{stats.currentMTDTotal.toLocaleString()} / {revenueGoal.toLocaleString()} ₽</span>
                        </div>
                        <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (stats.currentMTDTotal / revenueGoal) * 100)}%` }}
                                className="h-full bg-gradient-to-r from-sparta-gold to-yellow-500 rounded-full shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                            />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest pt-2">
                            <div className="flex items-center gap-1.5 border-r border-white/5 pr-4">
                                <Activity size={12} className="text-sparta-gold" />
                                <span>Темп: {Math.round(stats.currentMTDTotal / currentDay).toLocaleString()} ₽/день</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <TrendingUp size={12} className={stats.runRate >= revenueGoal ? 'text-emerald-400' : 'text-red-400'} />
                                <span>Прогноз: {stats.runRate.toLocaleString()} ₽ к концу месяца</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Metrics Grid - Row 1: Core Financials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#111] border border-white/5 p-6 rounded-3xl shadow-lg hover:border-sparta-gold/20 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sparta-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-sparta-gold/10 transition-all" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold">
                            <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col items-end">
                            {stats.trend >= 0 ? (
                                <div className="flex items-center gap-1 text-green-400 text-sm font-bold">
                                    <ArrowUpRight size={14} />
                                    <span>{stats.trend}%</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-red-400 text-sm font-bold">
                                    <ArrowDownRight size={14} />
                                    <span>{Math.abs(stats.trend)}%</span>
                                </div>
                            )}
                            <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${stats.mtdGrowth >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                {stats.mtdGrowth >= 0 ? '+' : ''}{stats.mtdGrowth}% MTD vs LM
                            </div>
                        </div>
                    </div>
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Чистая Выручка</div>
                    <div className="text-3xl font-russo text-white">{stats.totalNet.toLocaleString()} ₽</div>
                    <div className="text-[10px] font-medium text-white/40 mt-1">Оборот: {stats.totalGross.toLocaleString()} ₽ | Комиссии: <span className="text-red-400">-{stats.totalCommissions.toLocaleString()} ₽</span></div>
                </div>

                <div className="bg-[#111] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-red-500/20 transition-all shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400">
                            <Zap size={24} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-russo text-white mb-1">{stats.totalExpenses.toLocaleString()} ₽</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">Всего расходов</p>
                </div>

                <div className="bg-[#111] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/20 transition-all shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-3xl font-russo text-white">{stats.netProfit.toLocaleString()} ₽</h3>
                        {stats.grossMargin !== undefined && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">{stats.grossMargin}% маржа</span>
                        )}
                    </div>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">Чистая прибыль</p>
                </div>

                <div className="bg-[#111] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/20 transition-all shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                            <RefreshCw size={24} />
                        </div>
                        <div className="text-right">
                            <div className="text-blue-400 text-sm font-bold">{stats.retentionRate}%</div>
                            <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">ЛОЯЛЬНОСТЬ</div>
                        </div>
                    </div>
                    <h3 className="text-3xl font-russo text-white mb-1">{stats.retentionRate}%</h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-wider">Удержание клиентов</p>
                </div>
            </div>

            {/* Smart Metrics Grid - Row 2: Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <div className="bg-[#111]/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Доход с 1 клиента (LTV)</div>
                    <div className="text-xl font-russo text-white text-emerald-400">{stats.ltv.toLocaleString()} ₽</div>
                    <div className="text-[9px] text-white/20 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Сколько приносит 1 человек за всё время</div>
                </div>
                <div className="bg-[#111]/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Цена за привлечение (CAC)</div>
                    <div className="text-xl font-russo text-white text-orange-400">{stats.cac.toLocaleString()} ₽</div>
                    <div className="text-[9px] text-white/20 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Стоимость 1 нового клиента из рекламы</div>
                </div>
                <div className="bg-[#111]/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Реальный доход (Мес)</div>
                    <div className="text-xl font-russo text-white text-blue-400">{stats.currentMonthAccrual.toLocaleString()} ₽</div>
                    <div className="text-[9px] text-white/20 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">С учетом авансов и длинных абонементов</div>
                </div>
                <div className="bg-[#111]/50 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Средние расходы в день</div>
                    <div className="text-xl font-russo text-white text-red-400">{stats.burnRate.toLocaleString()} ₽</div>
                    <div className="text-[9px] text-white/20 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Сколько денег тратится в день (Burn Rate)</div>
                </div>
            </div>

            {/* Income & Expense Structure Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                {/* Income Structure Chart */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-all hover:border-sparta-gold/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1">Структура доходов</h2>
                            <p className="text-white/40 text-xs">Распределение по источникам</p>
                        </div>
                        <TrendingUp size={20} className="text-sparta-gold" />
                    </div>

                    <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.incomeBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.incomeBreakdown.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#FFD700', '#55DDFF', '#FFAA00'][index % 3]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">ВЫРУЧКА</div>
                                <div className="text-lg font-russo text-white">{stats.total.toLocaleString()} ₽</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {stats.incomeBreakdown.map((item, i) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FFD700', '#55DDFF', '#FFAA00'][i % 3] }} />
                                <span className="text-[10px] text-white/40 font-bold uppercase truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expense Structure Chart */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-all hover:border-red-500/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1">Структура расходов</h2>
                            <p className="text-white/40 text-xs">Распределение по категориям</p>
                        </div>
                        <Zap size={20} className="text-red-500" />
                    </div>

                    {stats.expenseBreakdown.length > 0 ? (
                        <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.expenseBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.expenseBreakdown.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#FFD700', '#FF3131', '#00D1FF', '#8B5CF6', '#10B981', '#F59E0B'][index % 6]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">РАСХОДЫ</div>
                                    <div className="text-lg font-russo text-white">{stats.totalExpenses.toLocaleString()} ₽</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest">
                            Нет данных о расходах
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {stats.expenseBreakdown.slice(0, 4).map((item, i) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FFD700', '#FF3131', '#00D1FF', '#8B5CF6', '#10B981', '#F59E0B'][i % 6] }} />
                                <span className="text-[10px] text-white/40 font-bold uppercase truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Top Programs */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-all hover:border-sparta-gold/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1 uppercase tracking-widest italic group-hover:text-sparta-gold transition-colors">Топ программ</h2>
                            <p className="text-white/40 text-[10px] font-manrope">Лидеры по доходности</p>
                        </div>
                        <div className="w-10 h-10 bg-sparta-gold/10 rounded-xl flex items-center justify-center text-sparta-gold">
                            <TrendingUp size={20} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {stats.topPrograms.slice(0, 5).map((p, i) => (
                            <div key={p.name} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group/item hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-russo text-white/20">{i + 1}</div>
                                    <div>
                                        <div className="text-white font-bold text-xs tracking-wide group-hover/item:text-sparta-gold transition-colors">{p.name}</div>
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">{p.count} продаж</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-russo text-xs">{p.revenue.toLocaleString()} ₽</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Shop Items */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-all hover:border-blue-500/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1 uppercase tracking-widest italic group-hover:text-blue-400 transition-colors">Топ товаров</h2>
                            <p className="text-white/40 text-[10px] font-manrope">Лидеры в магазине</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                            <ShoppingBag size={20} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {stats.topShopItems.length > 0 ? stats.topShopItems.slice(0, 5).map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group/item hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-russo text-white/20">{i + 1}</div>
                                    <div>
                                        <div className="text-white font-bold text-xs tracking-wide group-hover/item:text-blue-400 transition-colors">{item.name}</div>
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest">{item.count} шт</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-russo text-xs">{item.revenue.toLocaleString()} ₽</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-white/20 text-[10px] font-bold uppercase tracking-widest">Нет данных</div>
                        )}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-xl transition-all hover:border-purple-500/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1 uppercase tracking-widest italic group-hover:text-purple-400 transition-colors">Топ клиентов</h2>
                            <p className="text-white/40 text-[10px] font-manrope">Лояльная база</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.topCustomers.map((p, i) => (
                            <div key={p.email} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group/item hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-russo text-white/20">{i + 1}</div>
                                    <div className="min-w-0">
                                        <div className="text-white font-bold text-xs truncate group-hover/item:text-purple-400 transition-colors">{p.name}</div>
                                        <div className="text-[9px] text-white/20 font-black uppercase tracking-widest truncate">{p.email}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-russo text-xs">{p.revenue.toLocaleString()} ₽</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Expenses & Detailed Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
                <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-3xl p-8 relative shadow-xl overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1">История расходов</h2>
                            <p className="text-white/40 text-xs">Последние записи о затратах клуба</p>
                        </div>
                        <Zap size={20} className="text-red-500" />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-white/20 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                    <th className="text-left py-4">Дата</th>
                                    <th className="text-left py-4">Категория</th>
                                    <th className="text-left py-4">Описание</th>
                                    <th className="text-right py-4">Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {expenses.length > 0 ? expenses.slice(0, 10).map(exp => (
                                    <tr key={exp.id} className="group/row hover:bg-white/[0.02] transition-all">
                                        <td className="py-4 text-xs text-white/40">{format(exp.date, 'dd.MM.yyyy')}</td>
                                        <td className="py-4 text-xs font-bold text-white uppercase tracking-wider">{exp.category}</td>
                                        <td className="py-4 text-xs text-white/70 max-w-[200px] truncate">{exp.description}</td>
                                        <td className="py-4 text-right text-sm font-russo text-red-400">-{exp.amount.toLocaleString()} ₽</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">Нет данных о расходах</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative shadow-xl flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-russo text-white mb-6">Статистика заказов</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Абонементы</span>
                                <span className="text-sm font-russo text-white">{transactions.filter(t => t.type === 'subscription' && t.status === 'completed').length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Магазин</span>
                                <span className="text-sm font-russo text-white">{transactions.filter(t => t.type === 'shop_order' && t.status === 'completed').length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Пополнения</span>
                                <span className="text-sm font-russo text-white">{transactions.filter(t => t.type === 'topup' && t.status === 'completed').length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-russo text-white mb-1">Динамика дохов</h2>
                            <p className="text-white/40 text-xs">Выручка по дням за выбранный период</p>
                        </div>
                        <BarChart3 size={20} className="text-white/20" />
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevFinance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ffb800" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ffb800" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff20" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff20" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ color: '#ffb800' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#ffb800"
                                    strokeWidth={3}
                                    fill="url(#colorRevFinance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Transactions Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-12 mb-6">
                <h2 className="text-2xl font-russo text-white">История транзакций</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск по Email или ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#111] border border-white/5 rounded-xl py-2 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-[#111] border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-white/20"
                    >
                        <option value="all">Все категории</option>
                        <option value="subscription">Абонементы</option>
                        <option value="shop_order">Магазин</option>
                        <option value="topup">Пополнения</option>
                    </select>
                    <button
                        onClick={() => setShowAllStatuses(!showAllStatuses)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold ${showAllStatuses ? 'bg-sparta-gold/20 border-sparta-gold/30 text-sparta-gold' : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60'}`}
                        title={showAllStatuses ? "Скрыть незавершенные" : "Показать все статусы"}
                    >
                        {showAllStatuses ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="hidden md:inline">{showAllStatuses ? 'Все статусы' : 'Только успешные'}</span>
                    </button>
                </div>
            </div>

            {/* Transactions & Expenses Table */}
            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveTab('income')}
                            className={`pb-2 px-1 text-sm font-russo uppercase tracking-widest transition-all ${activeTab === 'income' ? 'text-sparta-gold border-b-2 border-sparta-gold' : 'text-white/20 hover:text-white/40'}`}
                        >
                            Доходы
                        </button>
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`pb-2 px-1 text-sm font-russo uppercase tracking-widest transition-all ${activeTab === 'expenses' ? 'text-red-500 border-b-2 border-red-500' : 'text-white/20 hover:text-white/40'}`}
                        >
                            Расходы
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-2xl justify-end">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sparta-gold transition-all" size={18} />
                            <input
                                type="text"
                                placeholder={activeTab === 'income' ? "Поиск по пользователю, ID или почте..." : "Поиск по описанию или категории..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:border-white/20 outline-none transition-all placeholder:text-white/10"
                            />
                        </div>
                        {activeTab === 'income' && (
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-white/5 border border-white/5 rounded-2xl py-3 px-6 text-sm text-white/60 outline-none hover:border-white/20 transition-all font-bold"
                            >
                                <option value="all">Все категории</option>
                                <option value="subscription">Абонементы</option>
                                <option value="shop_order">Магазин</option>
                                <option value="topup">Пополнения</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                {activeTab === 'income' ? (
                                    <>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">ID / Дата</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Пользователь</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Тип</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Метод</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Сумма</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Дата</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Описание</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Категория</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Сумма</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-manrope">
                            {activeTab === 'income' ? (
                                filteredTransactions.slice(0, 50).map((t) => (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-mono text-white/20 mb-1 group-hover:text-white/40">#{t.id.slice(0, 8)}</div>
                                            <div className="text-[10px] text-white/40 uppercase tracking-tighter">{format(t.date, 'dd.MM.yy HH:mm')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-white group-hover:text-sparta-gold transition-colors">{t.userName || '—'}</div>
                                            <div className="text-[10px] text-white/20 lowercase">{t.userEmail || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${t.type === 'subscription' ? 'bg-sparta-gold/10 text-sparta-gold border-sparta-gold/20' :
                                                    t.type === 'shop_order' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        t.type === 'topup' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                {t.type === 'subscription' ? 'Абонемент' :
                                                    t.type === 'shop_order' ? 'Магазин' :
                                                        t.type === 'topup' ? 'Пополнение' : 'Другое'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${t.method === 'balance' || t.method === 'wallet' ? 'bg-white/5 text-white/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    {t.method === 'robokassa' || t.method === 'tbank' || t.method === 'yookassa' ? <CreditCard size={14} /> :
                                                        (t.method === 'balance' || t.method === 'wallet' ? <Wallet size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20" />)}
                                                </div>
                                                <div>
                                                    <div className={`text-xs font-bold ${t.method === 'balance' || t.method === 'wallet' ? 'text-white/40' : 'text-white'}`}>
                                                        {t.method === 'robokassa' ? 'Robokassa' :
                                                            t.method === 'balance' ? 'Баланс' :
                                                                t.method === 'wallet' ? 'Кошелек' :
                                                                    t.method === 'tbank' ? 'Т-Банк' : t.method || '—'}
                                                    </div>
                                                    <div className="text-[9px] text-white/20 uppercase font-black tracking-widest">
                                                        {t.method === 'balance' || t.method === 'wallet' ? 'Внутренний' : 'Оплата извне'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-base font-bold ${t.method === 'balance' || t.method === 'wallet' ? 'text-white/20' : 'text-white'}`}>
                                                +{t.amount.toLocaleString()} ₽
                                            </div>
                                            {(t.method === 'balance' || t.method === 'wallet') && (
                                                <div className="text-[9px] text-white/10 italic">Не вкл. в выручку</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                expenses.filter(e =>
                                    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    e.category.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map((e) => (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-white/60">{format(e.date, 'dd.MM.yy')}</div>
                                            <div className="text-[10px] text-white/20">{format(e.date, 'HH:mm')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">{e.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                                                {e.category === 'rent' ? 'Аренда' :
                                                    e.category === 'salaries' ? 'Зарплаты' :
                                                        e.category === 'equipment' ? 'Оборудование' :
                                                            e.category === 'marketing' ? 'Маркетинг' :
                                                                e.category === 'utility' ? 'Коммуналка' : 'Прочее'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="text-base font-bold text-red-400">-{e.amount.toLocaleString()} ₽</div>
                                                <button
                                                    onClick={() => handleDeleteExpense(e.id)}
                                                    className="p-1.5 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                    title="Удалить расход"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {(activeTab === 'income' ? filteredTransactions : expenses).length === 0 && (
                    <div className="py-20 text-center text-white/20 font-manrope">
                        {activeTab === 'income' ? 'Транзакции не найдены' : 'Расходы не найдены'}
                    </div>
                )}
            </div>

            {/* Clear All Confirmation Modal */}
            <AnimatePresence>
                {isClearModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsClearModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative z-10 w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-2xl font-russo text-white text-center mb-2">Очистить историю?</h3>
                            <p className="text-white/40 text-center text-sm mb-8 font-manrope">
                                Это действие безвозвратно удалит все записи о транзакциях из базы данных. Вы уверены?
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => setIsClearModalOpen(false)} className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all">Отмена</button>
                                <button onClick={handleClearAll} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all">Да, удалить</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Smart Cleanup Modal */}
            <AnimatePresence>
                {isCleanupModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsCleanupModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative z-10 w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mx-auto mb-6">
                                <History size={32} />
                            </div>
                            <h3 className="text-2xl font-russo text-white text-center mb-2">Умная очистка</h3>
                            <p className="text-white/40 text-center text-sm mb-8 font-manrope">
                                Удалить транзакции старше выбранного периода:
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {[3, 6, 12, 24].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setCleanupMonths(m)}
                                        className={`py-3 rounded-xl border transition-all text-xs font-bold ${cleanupMonths === m ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                                    >
                                        {m} месяцев
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setIsCleanupModalOpen(false)} className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all">Отмена</button>
                                <button onClick={() => handleSmartCleanup(cleanupMonths)} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all">Очистить</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expense Modal */}
            <AnimatePresence>
                {isExpenseModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Новый расход</h3>
                                <button onClick={() => setIsExpenseModalOpen(false)} className="text-white/40 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddExpense} className="space-y-6">
                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Сумма (₽)</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-russo focus:border-red-500/50 outline-none transition-all placeholder:text-white/10"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Категория</label>
                                    <select
                                        name="category"
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-red-500/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="rent">Аренда</option>
                                        <option value="salaries">Зарплаты</option>
                                        <option value="equipment">Оборудование</option>
                                        <option value="marketing">Маркетинг</option>
                                        <option value="utility">Коммуналка</option>
                                        <option value="other">Прочее</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Описание</label>
                                    <textarea
                                        name="description"
                                        required
                                        rows={3}
                                        value={expenseDescription}
                                        onChange={(e) => {
                                            const text = e.target.value;
                                            setExpenseDescription(text);

                                            // Auto-category logic
                                            const lower = text.toLowerCase();
                                            if (lower.includes('аренда') || lower.includes('помещ') || lower.includes('зал')) setExpenseCategory('rent');
                                            else if (lower.includes('зарплат') || lower.includes('зп') || lower.includes('выплат') || lower.includes('тренер')) setExpenseCategory('salaries');
                                            else if (lower.includes('реклам') || lower.includes('маркетинг') || lower.includes('таргет') || lower.includes('лид')) setExpenseCategory('marketing');
                                            else if (lower.includes('свет') || lower.includes('вода') || lower.includes('интернет') || lower.includes('коммун')) setExpenseCategory('utility');
                                            else if (lower.includes('мяч') || lower.includes('форм') || lower.includes('инвент') || lower.includes('ремонт') || lower.includes('обор')) setExpenseCategory('equipment');
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:border-red-500/50 outline-none transition-all placeholder:text-white/10"
                                        placeholder="На что потрачено..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-5 bg-red-500 text-white rounded-2xl font-russo uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                >
                                    Сохранить расход
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AdminFinance;