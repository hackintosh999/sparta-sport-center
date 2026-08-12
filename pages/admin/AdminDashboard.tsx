import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, where, addDoc, serverTimestamp, Timestamp, arrayUnion, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, User, FileText, ShoppingBag, TrendingUp, Clock, PlusCircle, Edit3, Tag, MessageCircle, ChevronRight, Activity, X, Phone, CheckCircle, ExternalLink, MessageSquare, Wallet, CreditCard, ArrowUpRight, Trash2, Loader2, Bell } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const isDirector = userProfile?.role === 'director' || userProfile?.role === 'developer';
    const isDeveloper = userProfile?.role === 'developer';
    const canResetStats = isDirector || userProfile?.role === 'admin' || userProfile?.role === 'coach';

    // --- State for Stats ---
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeSubscriptions, setActiveSubscriptions] = useState(0);
    const [expiringSubscriptions, setExpiringSubscriptions] = useState<any[]>([]);
    const [subscriptionStats, setSubscriptionStats] = useState({
        active: 0,
        expiring: 0,
        expired: 0,
        total: 0
    });
    const [newRequests, setNewRequests] = useState(0);
    const [shopCollectionRevenue, setShopCollectionRevenue] = useState(0);
    const [ordersShopRevenue, setOrdersShopRevenue] = useState(0);
    const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
    const [topUpRevenue, setTopUpRevenue] = useState(0);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [registry, setRegistry] = useState<any[]>([]);
    const [avgAttendance, setAvgAttendance] = useState(0);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [topStudents, setTopStudents] = useState<any[]>([]);
    const [attentionStudents, setAttentionStudents] = useState<any[]>([]);
    const [activeGroupsCount, setActiveGroupsCount] = useState(0);

    const [chartData, setChartData] = useState<any[]>([]);
    const [purchaseDaysData, setPurchaseDaysData] = useState<any[]>([]);
    const [retentionRate, setRetentionRate] = useState(0);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State for Event Modal ---
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isSubDetailsOpen, setIsSubDetailsOpen] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isResettingAttendance, setIsResettingAttendance] = useState(false);

    const feedCache = useRef<{ [key: string]: any[] }>({ requests: [], shop_orders: [], subscriptions: [] });
    const dailyRevCache = useRef({
        shop_collection: {} as Record<string, number>,
        orders_shop: {} as Record<string, number>,
        orders_sub: {} as Record<string, number>,
        orders_topup: {} as Record<string, number>
    });
    const dailyReqCache = useRef<Record<string, number>>({});

    const updateActivityFeed = (newData: any[], source: string) => {
        feedCache.current[source] = newData;
        const combined = Object.values(feedCache.current).flat().sort((a: any, b: any) => b.timestamp - a.timestamp);
        setRecentActivity(combined.slice(0, 8));
        setLoading(false);
    };

    useEffect(() => {
        // Initialize 7 days array
        const labels = Array.from({ length: 7 }, (_, i) => {
            return format(subDays(new Date(), 6 - i), 'dd MMM', { locale: ru });
        });

        labels.forEach(l => {
            dailyRevCache.current.shop_collection[l] = 0;
            dailyRevCache.current.orders_shop[l] = 0;
            dailyRevCache.current.orders_sub[l] = 0;
            dailyRevCache.current.orders_topup[l] = 0;
            dailyReqCache.current[l] = 0;
        });

        const updateChart = () => {
            const finalData = labels.map(day => ({
                name: day,
                Выручка: (dailyRevCache.current.shop_collection[day] || 0) +
                    (dailyRevCache.current.orders_shop[day] || 0) +
                    (dailyRevCache.current.orders_sub[day] || 0) +
                    (dailyRevCache.current.orders_topup[day] || 0),
                Заявки: dailyReqCache.current[day] || 0
            }));
            setChartData(finalData);
        };

        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData as any);

            // Strictly count registered users (name + email)
            const registeredUsers = usersData.filter((u: any) => {
                const hasName = (u.childName && u.childName.trim().length > 0) || (u.displayName && u.displayName.trim().length > 0);
                const hasEmail = u.email && u.email.trim().length > 0;
                return hasName && hasEmail;
            });

            setTotalUsers(registeredUsers.length);

            let activeCount = 0;
            let expiringCount = 0;
            let expiredCount = 0;

            const expiring: any[] = [];
            const now = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            registeredUsers.forEach((data: any) => {
                const status = data.subscription?.status;

                if (status === 'active') {
                    activeCount++;
                    if (data.subscription?.endDate) {
                        const endDate = data.subscription.endDate instanceof Timestamp
                            ? data.subscription.endDate.toDate()
                            : new Date(data.subscription.endDate);

                        if (endDate <= sevenDaysFromNow && endDate > now) {
                            expiringCount++;
                            expiring.push({
                                id: data.id,
                                ...data,
                                daysLeft: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                } else if (status === 'expired' || (data.subscription && !status)) {
                    expiredCount++;
                }
            });

            setActiveSubscriptions(activeCount);
            setExpiringSubscriptions(expiring.sort((a, b) => a.daysLeft - b.daysLeft));
            setSubscriptionStats({
                active: activeCount,
                expiring: expiringCount,
                expired: expiredCount,
                total: registeredUsers.length
            });

            // Metric 2: Retention Rate
            const totalWithSub = activeCount + expiredCount;
            setRetentionRate(totalWithSub > 0 ? Math.round((activeCount / totalWithSub) * 100) : 0);
        });

        const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubRegistry = onSnapshot(collection(db, "student_registry"), (snapshot) => {
            setRegistry(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qRequests = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            let newCount = 0;
            const tempActivity: any[] = [];
            labels.forEach(l => dailyReqCache.current[l] = 0);

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.isArchived) return; // Skip archived for UI

                if (data.status === 'new' || !data.status) newCount++;
                if (data.createdAt?.seconds) {
                    const dayStr = format(new Date(data.createdAt.seconds * 1000), 'dd MMM', { locale: ru });
                    if (dailyReqCache.current[dayStr] !== undefined) dailyReqCache.current[dayStr]++;
                }
                if (tempActivity.length < 5) {
                    tempActivity.push({
                        type: 'request',
                        id: doc.id,
                        title: data.status === 'new' || !data.status ? 'Новая заявка' : `Заявка(${data.status})`,
                        desc: `${data.childName || 'Без имени'} (${data.parentPhone || 'Нет телефона'})`,
                        timestamp: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                        icon: FileText,
                        color: data.status === 'new' || !data.status ? 'text-sparta-gold' : 'text-blue-400',
                        rawData: data
                    });
                }
            });
            setNewRequests(newCount);
            setAllRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            updateActivityFeed(tempActivity, 'requests');
            updateChart();
        });

        const qShopOrders = query(collection(db, "shop_orders"), orderBy("createdAt", "desc"));
        const unsubShopOrders = onSnapshot(qShopOrders, (snapshot) => {
            let totalShopRev = 0;
            const tempActivity: any[] = [];
            labels.forEach(l => dailyRevCache.current.shop_collection[l] = 0);

            snapshot.forEach(doc => {
                const data = doc.data();
                const isCash = data.paymentMethod === 'robokassa' || data.type === 'topup' || (!data.paymentMethod && data.status === 'completed');

                // Revenue is ALWAYS counted (even if archived, though we only archive older than 7 days)
                if (data.status === 'completed' && isCash) {
                    const amt = (data.totalAmount || 0);
                    totalShopRev += amt;
                    if (data.createdAt?.seconds) {
                        const dayStr = format(new Date(data.createdAt.seconds * 1000), 'dd MMM', { locale: ru });
                        if (dailyRevCache.current.shop_collection[dayStr] !== undefined) dailyRevCache.current.shop_collection[dayStr] += amt;
                    }
                }

                if (data.isArchived) return; // Skip archived for activity feed

                if (tempActivity.length < 5) {
                    tempActivity.push({
                        type: 'order',
                        id: doc.id,
                        title: `Заказ #${doc.id.slice(0, 6)} `,
                        desc: `${data.totalAmount} ₽ (${data.paymentMethod === 'balance' ? 'Баланс' : 'Карта'})`,
                        timestamp: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                        icon: ShoppingBag,
                        color: data.paymentMethod === 'balance' ? 'text-gray-400' : 'text-emerald-400',
                        rawData: data
                    });
                }
            });
            setShopCollectionRevenue(totalShopRev);
            updateActivityFeed(tempActivity, 'shop_orders');
            updateChart();
        });

        const qOrders = query(collection(db, "orders"), orderBy("date", "desc"));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            let subRev = 0;
            let topUpRev = 0;
            let shopOrderRev = 0;
            const tempActivity: any[] = [];

            labels.forEach(l => {
                dailyRevCache.current.orders_shop[l] = 0;
                dailyRevCache.current.orders_sub[l] = 0;
                dailyRevCache.current.orders_topup[l] = 0;
            });

            snapshot.forEach(doc => {
                const data = doc.data();
                const isCash = data.paymentMethod === 'robokassa' || data.type === 'topup';

                if (data.status === 'completed' && isCash) {
                    const amt = (data.totalAmount || data.price || data.amount || 0);
                    const dayStr = data.date?.seconds
                        ? format(new Date(data.date.seconds * 1000), 'dd MMM', { locale: ru })
                        : (data.createdAt?.seconds ? format(new Date(data.createdAt.seconds * 1000), 'dd MMM', { locale: ru }) : null);

                    if (data.type === 'subscription') {
                        subRev += amt;
                        if (dayStr && dailyRevCache.current.orders_sub[dayStr] !== undefined) dailyRevCache.current.orders_sub[dayStr] += amt;
                    } else if (data.type === 'topup') {
                        topUpRev += amt;
                        if (dayStr && dailyRevCache.current.orders_topup[dayStr] !== undefined) dailyRevCache.current.orders_topup[dayStr] += amt;
                    } else if (data.type === 'shop_order') {
                        shopOrderRev += amt;
                        if (dayStr && dailyRevCache.current.orders_shop[dayStr] !== undefined) dailyRevCache.current.orders_shop[dayStr] += amt;
                    }
                }

                if (data.isArchived) return; // Skip archived for activity feed

                if (tempActivity.length < 5) {
                    const typeLabel = data.type === 'topup' ? 'Пополнение' : (data.type === 'subscription' ? 'Подписка' : 'Магазин');
                    tempActivity.push({
                        type: data.type || 'order',
                        id: doc.id,
                        title: `${typeLabel} (${data.paymentMethod === 'balance' ? 'Баланс' : 'Карта'})`,
                        desc: `${data.totalAmount || data.price || data.amount || 0} ₽ - ${data.email || 'Пользователь'} `,
                        timestamp: data.date?.seconds ? data.date.seconds * 1000 : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now()),
                        icon: data.type === 'topup' ? Wallet : (data.type === 'subscription' ? Activity : ShoppingBag),
                        color: data.paymentMethod === 'balance' ? 'text-gray-400' : (data.type === 'topup' ? 'text-blue-400' : 'text-emerald-400'),
                        rawData: data
                    });
                }
            });

            setSubscriptionRevenue(subRev);
            setTopUpRevenue(topUpRev);
            setOrdersShopRevenue(shopOrderRev);

            // Metric 4: Purchase Days Histogram (1-31)
            const daysMap: Record<number, number> = {};
            for (let i = 1; i <= 31; i++) daysMap[i] = 0;

            const threeMonthsAgo = subDays(new Date(), 90);
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'completed') return;
                const date = data.date?.toDate() || data.createdAt?.toDate();
                if (!date || date < threeMonthsAgo) return;

                const day = date.getDate();
                const amt = (data.totalAmount || data.price || data.amount || 0);
                daysMap[day] += amt;
            });

            setPurchaseDaysData(Object.entries(daysMap).map(([day, revenue]) => ({
                day,
                revenue
            })));

            updateActivityFeed(tempActivity, 'subscriptions');
            updateChart();
        });

        const unsubGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubCoaches = onSnapshot(collection(db, "coaches"), (snapshot) => {
            setCoaches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        // Attendance Analytics Listener (Just sync raw data)
        const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
            setAttendanceData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubUsers();
            unsubRequests();
            unsubShopOrders();
            unsubOrders();
            unsubGroups();
            unsubCoaches();
            unsubAttendance();
            unsubRegistry();
            unsubExpenses();
        };
    }, []);

    // --- EFFECT: Calculate Attendance Stats & Ratings (ID merging, Accuracy, Consistency) ---
    useEffect(() => {
        if (attendanceData.length === 0) return;

        let totalPresent30 = 0;
        let totalRecords30 = 0;
        const studentStats: Record<string, { id: string; name: string; presentCount: number; presentCount30: number; total30: number; lastVisit?: Date }> = {};

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Map registry IDs to real User UIDs for merging statistics
        const idMap: Record<string, string> = {};
        registry.forEach(r => {
            if (r.assignedUid) idMap[r.id] = r.assignedUid;
        });

        attendanceData.forEach(doc => {
            const data = doc;
            const groupId = data.groupId;

            // Skip attendance from groups that no longer exist (Accuracy for 'real' statistics)
            if (groupId && !groups.some(g => g.id === groupId)) return;

            const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
            const isRecent = date >= thirtyDaysAgo;
            const records = data.records || {};

            Object.entries(records).forEach(([studentId, record]: [string, any]) => {
                // Determine normalized ID (if it's a ghost that became real, merge into real UID)
                const normalizedId = idMap[studentId] || studentId;
                const status = typeof record === 'string' ? record : record?.status;

                if (!status || status === 'none') return; // Skip empty marks

                if (!studentStats[normalizedId]) {
                    studentStats[normalizedId] = { id: normalizedId, name: 'Загрузка...', presentCount: 0, presentCount30: 0, total30: 0 };
                }

                if (status === 'present') {
                    studentStats[normalizedId].presentCount++;
                    if (!studentStats[normalizedId].lastVisit || date > studentStats[normalizedId].lastVisit!) {
                        studentStats[normalizedId].lastVisit = date;
                    }
                }

                if (isRecent) {
                    if (status !== 'sick') {
                        totalRecords30++;
                        studentStats[normalizedId].total30++;
                        if (status === 'present') {
                            totalPresent30++;
                            studentStats[normalizedId].presentCount30++;
                        }
                    }
                }
            });
        });

        const avg = totalRecords30 > 0 ? Math.round((totalPresent30 / totalRecords30) * 100) : 0;
        setAvgAttendance(avg);

        // Sort top students (By 30 day activity)
        const sortedStudents = Object.values(studentStats)
            .filter(s => s.total30 > 0)
            .sort((a, b) => b.presentCount30 - a.presentCount30)
            .slice(0, 5);
        setTopStudents(sortedStudents);

        // Risk Students logic
        const now = new Date();
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const attentionList = Object.values(studentStats)
            .map(s => {
                const rate30 = s.total30 > 0 ? (s.presentCount30 / s.total30) * 100 : 0;
                const isLongAbsent = s.lastVisit && s.lastVisit < fourteenDaysAgo;
                const daysSinceLast = s.lastVisit ? Math.floor((now.getTime() - s.lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : 99;

                return {
                    ...s,
                    rate: rate30,
                    isLongAbsent,
                    daysSinceLast,
                    criticalValue: isLongAbsent ? 100 + daysSinceLast : (100 - rate30)
                };
            })
            .filter(s => (s.total30 >= 2 && s.rate < 50) || s.isLongAbsent)
            .sort((a, b) => b.criticalValue - a.criticalValue)
            .slice(0, 5);
        setAttentionStudents(attentionList);
    }, [attendanceData, users, registry, groups]);

    const allTimeNet = shopCollectionRevenue + ordersShopRevenue + subscriptionRevenue + topUpRevenue;

    // Help identify "Real" registered students for business metrics
    const registeredStudents = users.filter((u: any) => {
        const hasName = (u.childName && u.childName.trim().length > 0) || (u.displayName && u.displayName.trim().length > 0);
        const hasEmail = u.email && u.email.trim().length > 0;
        return hasName && hasEmail;
    });

    const uniqueUsersCount = registeredStudents.length;
    const homeLtv = uniqueUsersCount > 0 ? Math.round(allTimeNet / uniqueUsersCount) : 0;
    const totalMarketing = expenses.filter(e => e.category === 'marketing').reduce((acc, curr) => acc + curr.amount, 0);
    const homeCac = uniqueUsersCount > 0 ? Math.round(totalMarketing / uniqueUsersCount) : 0;

    const handleUpdateEventStatus = async (id: string, collectionName: string, newStatus: string) => {
        try {
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, {
                status: newStatus,
                history: arrayUnion({
                    status: newStatus,
                    timestamp: Timestamp.now(),
                    note: `Статус изменен администратором на "${newStatus}"`
                })
            });
            console.log("Status updated successfully to:", newStatus);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Ошибка при обновлении статуса");
        }
    };

    const openInAppChat = async (req: any) => {
        if (!req.email) {
            alert("Для открытия чата необходим Email пользователя.");
            return;
        }

        try {
            const q = query(collection(db, "messages"), where("email", "==", req.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                navigate(`/admin/messages?id=${snapshot.docs[0].id}`);
            } else {
                const docRef = await addDoc(collection(db, "messages"), {
                    userId: req.userId || null,
                    name: `${req.childSurname || req.name || ''} ${req.childName || ''}`.trim(),
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Контакт из дашборда'}`,
                    message: req.comment || 'Запрос из панели управления',
                    status: 'new',
                    createdAt: serverTimestamp(),
                    thread: [{
                        text: req.comment || `Запрос на программу: ${req.programType || 'Общие вопросы'}`,
                        sender: 'user',
                        senderName: req.childName || req.name || 'Пользователь',
                        createdAt: Timestamp.now()
                    }]
                });
                navigate(`/admin/messages?id=${docRef.id}`);
            }
        } catch (error) {
            console.error("Error opening chat:", error);
            alert("Ошибка при открытии чата. Проверьте консоль.");
        }
    };

    const handleCleanup = async () => {
        if (!window.confirm("Архивировать завершенные события старше 7 дней? Продолжить?")) return;

        setIsCleaning(true);
        try {
            const batch = writeBatch(db);
            const sevenDaysAgo = subDays(new Date(), 7);

            // Cleanup Requests
            const qReq = query(collection(db, "requests"), where("status", "in", ["completed", "rejected"]));
            const snapReq = await getDocs(qReq);
            snapReq.forEach(d => {
                const data = d.data();
                const date = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;
                if (date && date < sevenDaysAgo) {
                    batch.update(d.ref, { isArchived: true });
                }
            });

            // Cleanup Orders
            const qOrd = query(collection(db, "orders"), where("status", "==", "completed"));
            const snapOrd = await getDocs(qOrd);
            snapOrd.forEach(d => {
                const data = d.data();
                const date = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;
                if (date && date < sevenDaysAgo) {
                    batch.update(d.ref, { isArchived: true });
                }
            });

            // Cleanup Shop Orders
            const qShop = query(collection(db, "shop_orders"), where("status", "==", "completed"));
            const snapShop = await getDocs(qShop);
            snapShop.forEach(d => {
                const data = d.data();
                const date = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;
                if (date && date < sevenDaysAgo) {
                    batch.update(d.ref, { isArchived: true });
                }
            });

            await batch.commit();
            alert("Очистка завершена!");
        } catch (error) {
            console.error("Cleanup error:", error);
            alert("Ошибка при очистке.");
        } finally {
            setIsCleaning(false);
        }
    };

    const handleResetAttendance = async () => {
        if (!canResetStats) return;
        if (!window.confirm("ВНИМАНИЕ! Это действие полностью удалит ВСЕ записи о посещаемости из базы данных. Это сбросит списки ТОП-учеников и В зоне внимания. Вы уверены?")) return;

        setIsResettingAttendance(true);
        try {
            const snap = await getDocs(collection(db, "attendance"));
            let count = 0;
            let batch = writeBatch(db);
            for (const d of snap.docs) {
                batch.delete(d.ref);
                count++;
                if (count === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }
            if (count > 0) await batch.commit();
            alert("Данные посещаемости успешно удалены! Списки обновятся автоматически.");
        } catch (error) {
            console.error("Reset error:", error);
            alert("Ошибка при сбросе данных.");
        } finally {
            setIsResettingAttendance(false);
        }
    };

    const stats = [
        { label: 'Всего пользователей', value: totalUsers, icon: Users, color: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', trend: 'В базе данных' },
        {
            label: 'Активные абонементы',
            value: subscriptionStats.active,
            icon: TrendingUp,
            color: 'text-purple-400',
            glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
            trend: `${Math.round((subscriptionStats.active / (subscriptionStats.total || 1)) * 100)}% от базы`,
            subValue: `Истекают: ${subscriptionStats.expiring} | Долги: ${subscriptionStats.expired}`,
            onClick: () => setIsSubDetailsOpen(true)
        },
        {
            label: 'Новые заявки',
            value: newRequests,
            icon: FileText,
            color: 'text-yellow-500',
            glow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]',
            trend: 'Требуют внимания',
            onClick: () => setIsRequestsOpen(true)
        },
        {
            label: 'Выручка (Карты)',
            value: `${(shopCollectionRevenue + ordersShopRevenue + subscriptionRevenue + topUpRevenue).toLocaleString()} ₽`,
            icon: CreditCard,
            color: 'text-emerald-400',
            glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]',
            trend: 'Только Robokassa/TopUp',
            isRevenue: true
        },
        {
            label: 'Посещаемость',
            value: `${avgAttendance}% `,
            icon: Activity,
            color: 'text-orange-500',
            glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]',
            trend: 'Средняя по клубу'
        },
        {
            label: 'LTV (Ср. доход)',
            value: `${homeLtv.toLocaleString()} ₽`,
            icon: Wallet,
            color: 'text-emerald-400',
            glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]',
            trend: 'Ценность клиента',
            isDirectorOnly: true
        },
        {
            label: 'CAC (Затраты)',
            value: `${homeCac.toLocaleString()} ₽`,
            icon: ShoppingBag,
            color: 'text-orange-400',
            glow: 'shadow-[0_0_15px_rgba(251,146,60,0.5)]',
            trend: 'На 1 привлечение',
            isDirectorOnly: true
        },
    ];

    const quickActions = [
        { label: 'Добавить группу', icon: PlusCircle, path: '/admin/groups', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30' },
        { label: 'Создать новость', icon: Edit3, path: '/admin/news', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30' },
        { label: 'Новый промокод', icon: Tag, path: '/admin/promos', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30' },
        { label: 'Модерация', icon: MessageCircle, path: '/admin/comments', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/30' },
    ];

    const containerVariants: any = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Activity size={32} className="text-sparta-gold animate-pulse" />
                <span className="text-white/50 font-manrope">Сбор данных со спутников...</span>
            </div>
        </div>
    );

    return (
        <div className="relative">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pb-10"
            >
                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-russo text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-2 flex items-center gap-3">
                            {isDirector ? 'Кабинет директора' : 'Панель администратора'}
                        </h1>
                        <p className="text-white/40 text-sm font-manrope">
                            {isDirector
                                ? 'Полный контроль над финансами и развитием клуба'
                                : 'Оперативное управление и мониторинг активности'}
                        </p>
                    </div>
                    <div className="text-right bg-[#111] px-5 py-3 rounded-2xl border border-white/5 shadow-md hidden md:block">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">{format(new Date(), 'eeee', { locale: ru })}</p>
                        <p className="text-white font-russo text-xl tracking-wide">{format(new Date(), 'dd MMMM yyyy', { locale: ru })}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, i) => (
                        <Link key={i} to={action.path} className={`relative flex items-center justify-between p-4 rounded-2xl border ${action.border} bg-gradient-to-br ${action.color} hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all group overflow-hidden`}>
                            <div className="flex items-center gap-3 relative z-10">
                                <action.icon size={20} className="text-white/70 group-hover:text-white transition-colors" />
                                <span className="font-manrope text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{action.label}</span>
                            </div>
                            <ChevronRight size={16} className="text-white/30 group-hover:translate-x-1 group-hover:text-white/70 transition-all relative z-10 mx-2" />
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
                        </Link>
                    ))}
                </motion.div>

                {/* Main Stats */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {stats.filter(s => (!s.isRevenue && !s.isDirectorOnly) || isDirector).map((stat, index) => (
                        <div
                            key={index}
                            onClick={stat.onClick}
                            className={`relative bg-[#111] border border-white/5 p-6 rounded-3xl overflow-hidden group hover:border-white/10 transition-colors shadow-lg ${stat.onClick ? 'cursor-pointer hover:bg-[#151515] hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                        >
                            {/* Glow effect */}
                            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-current opacity-[0.03] blur-2xl rounded-full group-hover:opacity-[0.08] transition-opacity ${stat.color}`} />

                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center ${stat.color} ${stat.glow} transition-all duration-500`}>
                                    <stat.icon size={26} className="drop-shadow-lg" />
                                </div>
                                <span className="text-white/40 text-[10px] font-bold uppercase px-2.5 py-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className="text-3xl font-bold text-white font-russo mb-1 relative z-10 tracking-wide">{stat.value}</h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider relative z-10 mb-4">{stat.label}</p>

                            {!stat.isRevenue && stat.subValue && (
                                <div className="pt-3 border-t border-white/5 relative z-10 mb-2">
                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-tight leading-tight">{stat.subValue}</p>
                                </div>
                            )}

                            {/* Breakdown for Revenue */}
                            {stat.isRevenue && (
                                <div className="grid grid-cols-3 gap-2 relative z-10 pt-4 border-t border-white/5">
                                    <div className="text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-black mb-1">Магазин</p>
                                        <p className="text-[10px] text-emerald-400 font-bold">{(shopCollectionRevenue + ordersShopRevenue).toLocaleString()} ₽</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-black mb-1">Абон</p>
                                        <p className="text-[10px] text-purple-400 font-bold">{subscriptionRevenue.toLocaleString()} ₽</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-black mb-1">Пополн</p>
                                        <p className="text-[10px] text-blue-400 font-bold">{topUpRevenue.toLocaleString()} ₽</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </motion.div>


                {/* Content Row: Chart & Feed */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Revenue Chart - ONLY FOR DIRECTOR */}
                    {isDirector && (
                        <motion.div variants={itemVariants} className="xl:col-span-2 bg-[#111] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-lg">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-russo text-white mb-1">Динамика заказов</h2>
                                    <p className="text-white/40 text-xs font-manrope">Сумма оплаченных заказов за последние 7 дней</p>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                    <TrendingUp size={14} />
                                    <span className="text-xs font-bold font-manrope">Рост</span>
                                </div>
                            </div>

                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} `} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#ffffff20', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '12px' }}
                                            itemStyle={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Manrope' }}
                                            labelStyle={{ color: '#ffffff80', marginBottom: '8px', fontSize: '12px', fontFamily: 'Manrope' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="Выручка"
                                            stroke="#34d399"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorRev)"
                                            activeDot={{ r: 6, fill: '#111', stroke: '#34d399', strokeWidth: 3 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    )}


                    {/* Right Column: Top Students & Activity Feed */}
                    <div className={isDirector ? "flex flex-col gap-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:col-span-3"}>
                        {/* Top Active Students */}
                        <motion.div variants={itemVariants} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                    <Activity size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-russo text-white leading-tight">Топ учеников</h2>
                                    <p className="text-[10px] text-orange-400/60 font-black uppercase tracking-widest">Активность за 30 дней</p>
                                </div>
                                {canResetStats && (
                                    <button
                                        onClick={handleResetAttendance}
                                        disabled={isResettingAttendance}
                                        className="ml-auto p-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-lg text-white/20 hover:text-red-500 transition-all group/reset"
                                        title="Очистить данные посещаемости"
                                    >
                                        {isResettingAttendance ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4 flex-1">
                                {topStudents.length === 0 ? (
                                    <div className="text-white/20 text-xs text-center py-10 italic border border-dashed border-white/5 rounded-2xl">Нет данных для рейтинга</div>
                                ) : (
                                    topStudents.map((student, idx) => (
                                        <div key={student.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-black">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-wide">
                                                        {(() => {
                                                            const foundUser = users.find(u => u.id === student.id);
                                                            if (foundUser) return foundUser.childName;
                                                            const foundGhost = registry.find(r => r.id === student.id);
                                                            if (foundGhost) return foundGhost.originalName;
                                                            return "Ученик";
                                                        })()}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 uppercase font-black">Посещений (30д): {student.presentCount30}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                                {student.presentCount > student.presentCount30 && (
                                                    <span className="text-[8px] text-white/10 font-bold uppercase mt-1">Всего: {student.presentCount}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Expiring Subscriptions (URGENT RENEWALS) */}
                        <motion.div variants={itemVariants} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sparta-gold/30 to-transparent" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                    <Clock size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-russo text-white leading-tight">🔥 Продления</h2>
                                    <p className="text-[10px] text-sparta-gold/60 font-black uppercase tracking-widest">Ближайшие 7 дней</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                {expiringSubscriptions.length === 0 ? (
                                    <div className="text-white/20 text-xs text-center py-10 italic border border-dashed border-white/5 rounded-2xl">Все абонементы в порядке</div>
                                ) : (
                                    expiringSubscriptions.map((student) => (
                                        <div key={student.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-sparta-gold/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black italic ${student.daysLeft <= 2 ? 'bg-red-500/20 text-red-500' : 'bg-sparta-gold/20 text-sparta-gold'}`}>
                                                    {student.daysLeft}д
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-wide">{student.childName || student.name || 'Клиент'}</p>
                                                    <p className="text-[10px] text-white/30 uppercase font-black">{student.subscription.name}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/admin/users?search=${student.email}`)}
                                                className="p-2 bg-white/5 hover:bg-sparta-gold/10 rounded-lg text-white/20 group-hover:text-sparta-gold transition-all"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            {expiringSubscriptions.length > 0 && (
                                <p className="text-[9px] text-white/20 mt-4 text-center uppercase font-black tracking-widest">Нужно напомнить о продлении</p>
                            )}
                        </motion.div>

                        {/* At Risk Students (New Widget) */}
                        <motion.div variants={itemVariants} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                    <Bell size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-russo text-white leading-tight">В зоне внимания</h2>
                                    <p className="text-[10px] text-red-500/60 font-black uppercase tracking-widest">Пропуски и отсутствие</p>
                                </div>
                                {canResetStats && (
                                    <button
                                        onClick={handleResetAttendance}
                                        disabled={isResettingAttendance}
                                        className="ml-auto p-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-lg text-white/20 hover:text-red-500 transition-all group/reset"
                                        title="Очистить данные посещаемости"
                                    >
                                        {isResettingAttendance ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4 flex-1">
                                {attentionStudents.length === 0 ? (
                                    <div className="text-white/20 text-xs text-center py-10 italic border border-dashed border-white/5 rounded-2xl">Все ученики активны</div>
                                ) : (
                                    attentionStudents.map((student) => (
                                        <div key={student.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-red-500/5 hover:border-red-500/20 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black italic ${student.isLongAbsent ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-500'}`}>
                                                    {student.isLongAbsent ? <Clock size={12} /> : '!'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-wide">
                                                        {(() => {
                                                            const foundUser = users.find(u => u.id === student.id);
                                                            if (foundUser) return foundUser.childName;
                                                            const foundGhost = registry.find(r => r.id === student.id);
                                                            if (foundGhost) return foundGhost.originalName;
                                                            return "Ученик";
                                                        })()}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {student.isLongAbsent ? (
                                                            <p className="text-[10px] text-red-500/70 uppercase font-black">Не был {student.daysSinceLast} дн.</p>
                                                        ) : (
                                                            <>
                                                                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-red-500" style={{ width: `${Math.round(student.rate)}%` }} />
                                                                </div>
                                                                <p className="text-[10px] text-red-500/70 uppercase font-black">{Math.round(student.rate)}% посещаемости</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-white/20 font-bold uppercase tracking-tighter text-right">
                                                {student.isLongAbsent ? 'Бросил?' : 'Частые пропуски'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>

                        {/* Recent Activity Feed */}
                        <motion.div variants={itemVariants} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col shadow-lg relative">
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                        <Clock size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-russo text-white leading-tight">Лента событий</h2>
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Оперативная сводка</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCleanup}
                                    disabled={isCleaning}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 transition-all group/clean"
                                    title="Очистка старых событий"
                                >
                                    {isCleaning ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} className="group-hover/clean:scale-110 transition-transform" />
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-wider">Очистка</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mt-2">
                                {recentActivity.length === 0 ? (
                                    <div className="text-white/30 text-center py-8 font-manrope text-sm h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl">
                                        Нет недавней активности
                                    </div>
                                ) : (
                                    recentActivity.map((activity, idx) => {
                                        const Icon = activity.icon;
                                        return (
                                            <div
                                                key={`${activity.type} -${activity.id} -${idx} `}
                                                onClick={() => setSelectedEvent(activity)}
                                                className="flex gap-4 p-4 rounded-2xl bg-[#1a1a1a] border border-white/5 hover:border-white/20 hover:bg-[#222] transition-all group cursor-pointer"
                                            >
                                                <div className={`w-11 h-11 rounded-xl bg-[#111] flex items-center justify-center flex-shrink-0 self-start border border-white/5 shadow-inner ${activity.color} group-hover:scale-110 transition-transform`}>
                                                    <Icon size={18} className="drop-shadow-md" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-white font-bold text-sm truncate group-hover:text-sparta-gold transition-colors">{activity.title}</h4>
                                                        <span className="text-[10px] text-white/30 whitespace-nowrap ml-2 font-bold px-2 py-0.5 bg-white/5 rounded-full">
                                                            {format(new Date(activity.timestamp), 'HH:mm', { locale: ru })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/50 truncate font-manrope leading-tight">{activity.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>

                </div>
            </motion.div>

            {/* Applications Management Modal */}
            <AnimatePresence>
                {isRequestsOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsRequestsOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            layoutId="requests-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5 relative bg-[#0a0a0a]">
                                <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                        <FileText size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-russo text-white uppercase tracking-wider">Управление заявками</h2>
                                        <p className="text-white/40 font-manrope text-sm tracking-wide">Активных обращений: {newRequests}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsRequestsOpen(false)}
                                    className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="space-y-4">
                                    {allRequests.length === 0 ? (
                                        <div className="py-20 text-center text-white/20 italic border border-dashed border-white/5 rounded-[32px]">Нет активных заявок</div>
                                    ) : (
                                        allRequests.map((req) => (
                                            <div
                                                key={req.id}
                                                className={`p-5 rounded-[24px] bg-white/5 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all hover:bg-white/[0.07] ${req.status === 'new' || !req.status ? 'border-l-4 border-l-yellow-500 pl-4' : ''}`}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${req.status === 'new' || !req.status ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/20'}`}>
                                                        <User size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-white font-bold text-base truncate">{req.childName || 'Без имени'}</p>
                                                            {(req.status === 'new' || !req.status) && (
                                                                <span className="px-2 py-0.5 rounded-lg bg-yellow-500 text-black text-[9px] font-black uppercase ring-4 ring-yellow-500/20 animate-pulse">NEW</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                            <p className="text-xs text-white/40 flex items-center gap-1.5"><Phone size={10} /> {req.parentPhone || 'Нет номера'}</p>
                                                            <p className="text-xs text-white/30 flex items-center gap-1.5 font-bold uppercase tracking-tighter">
                                                                <Clock size={10} /> {req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), 'd MMM, HH:mm', { locale: ru }) : 'Неизвестно'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <button
                                                        onClick={() => openInAppChat(req)}
                                                        className="flex-1 md:flex-none p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5 flex justify-center items-center gap-2 text-xs font-bold"
                                                    >
                                                        <MessageSquare size={16} /> Чат
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateEventStatus(req.id, 'requests', 'contacted')}
                                                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg ${req.status === 'contacted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-sparta-gold text-black hover:scale-105 active:scale-95'}`}
                                                    >
                                                        {req.status === 'contacted' ? 'В работе' : 'Взять в работу'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => setIsRequestsOpen(false)}
                                    className="px-8 py-3 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all font-manrope text-sm"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subscription Details Detailed Modal */}
            <AnimatePresence>
                {isSubDetailsOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSubDetailsOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            layoutId="sub-details-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5 relative bg-[#0a0a0a]">
                                <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                            <TrendingUp size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-russo text-white uppercase tracking-wider">Анализ абонементов</h2>
                                            <p className="text-white/40 font-manrope text-sm tracking-wide">Всего в базе: {subscriptionStats.total} пользователей</p>
                                        </div>
                                    </div>
                                    <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-2.5 hidden sm:block">
                                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">Retention Health</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-russo text-emerald-400">{retentionRate}%</span>
                                            <span className="text-[9px] text-emerald-400/50 uppercase font-bold tracking-tighter">Продления</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSubDetailsOpen(false)}
                                    className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content Tabs/Cols */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                                    {/* Active */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-emerald-400 font-russo text-sm uppercase tracking-widest">Активные ({subscriptionStats.active})</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                        </div>
                                        <div className="space-y-3">
                                            {users.filter(u => u.subscription?.status === 'active').slice(0, 50).map(user => (
                                                <div key={user.id} onClick={() => { setIsSubDetailsOpen(false); navigate(`/admin/users/${user.id}`); }} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all">
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{user.childName || user.displayName || 'Без имени'}</p>
                                                        <p className="text-[10px] text-white/30 uppercase font-black">{user.email}</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-white/10 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Expiring */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-sparta-gold font-russo text-sm uppercase tracking-widest">Истекают ({subscriptionStats.expiring})</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-sparta-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                        </div>
                                        <div className="space-y-3">
                                            {expiringSubscriptions.map(user => (
                                                <div key={user.id} onClick={() => { setIsSubDetailsOpen(false); navigate(`/admin/users/${user.id}`); }} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-sparta-gold/10 hover:border-sparta-gold/20 transition-all">
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{user.childName || user.displayName || 'Без имени'}</p>
                                                        <p className={`text-[10px] font-black uppercase ${user.daysLeft <= 1 ? 'text-red-500' : 'text-sparta-gold/70'}`}>
                                                            Осталось: {user.daysLeft} дн.
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-white/10 group-hover:text-sparta-gold group-hover:translate-x-1 transition-all" />
                                                </div>
                                            ))}
                                            {expiringSubscriptions.length === 0 && (
                                                <div className="py-10 text-center text-white/20 italic text-xs border border-dashed border-white/10 rounded-2xl">Нет горящих подписок</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expired / Debts */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-red-500 font-russo text-sm uppercase tracking-widest">Просрочены ({subscriptionStats.expired})</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                        </div>
                                        <div className="space-y-3">
                                            {users.filter(u => u.subscription && u.subscription.status !== 'active').slice(0, 50).map(user => (
                                                <div key={user.id} onClick={() => { setIsSubDetailsOpen(false); navigate(`/admin/users/${user.id}`); }} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{user.childName || user.displayName || 'Без имени'}</p>
                                                        <p className="text-[10px] text-red-500/70 uppercase font-black">Требуется продление</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-white/10 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            ))}
                                            {subscriptionStats.expired === 0 && (
                                                <div className="py-10 text-center text-white/20 italic text-xs border border-dashed border-white/10 rounded-2xl">Все подписки в порядке</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Metric 4: Purchase Days Histogram */}
                                <div className="mt-12 pt-8 border-t border-white/5">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 px-2">
                                        <div>
                                            <h3 className="text-xl font-russo text-white uppercase tracking-wider">Гистограмма пиковых оплат</h3>
                                            <p className="text-white/30 text-[10px] font-manrope uppercase font-bold tracking-widest mt-1">Распределение выручки по дням месяца (последние 90 дней)</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/5">
                                            <span className="text-[10px] text-white/20 font-black uppercase tracking-wider mr-2">Top Day:</span>
                                            <span className="text-sparta-gold font-russo">
                                                {purchaseDaysData.length > 0 ? [...purchaseDaysData].sort((a, b) => b.revenue - a.revenue)[0]?.day : '--'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-[250px] w-full bg-white/2 backdrop-blur-sm rounded-[30px] p-6 border border-white/5">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={purchaseDaysData}>
                                                <defs>
                                                    <linearGradient id="colorRevModal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                <XAxis
                                                    dataKey="day"
                                                    stroke="#ffffff20"
                                                    fontSize={10}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fill: '#ffffff40', fontWeight: 'bold' }}
                                                />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '16px' }}
                                                    itemStyle={{ color: '#d4af37', fontSize: '14px', fontFamily: 'Russo One' }}
                                                    labelStyle={{ color: '#ffffff40', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}
                                                    labelFormatter={(label) => `Число месяца: ${label}`}
                                                    formatter={(value: any) => [`${value.toLocaleString()} ₽`, 'Выручка']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#d4af37"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRevModal)"
                                                    animationDuration={2000}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-center text-[9px] text-white/10 font-bold uppercase tracking-[0.2em] mt-6">Статистическая активность платежной системы клуба</p>
                                </div>

                                {/* Footer */}
                                <div className="p-6 pt-10 flex justify-end">
                                    <button
                                        onClick={() => setIsSubDetailsOpen(false)}
                                        className="px-8 py-3 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all font-manrope text-sm"
                                    >
                                        Закрыть
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* Interactive Event Details Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div className={`absolute -top-20 -right-20 w-64 h-64 bg-current opacity-5 blur-3xl rounded-full ${selectedEvent.color}`} />

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className={`w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center ${selectedEvent.color} shadow-lg shrink-0`}>
                                    <selectedEvent.icon size={32} />
                                </div>
                                <div className="min-w-0 pr-8">
                                    <h2 className="text-2xl font-russo text-white truncate">{selectedEvent.title}</h2>
                                    <p className="text-white/40 text-sm font-manrope mt-1">
                                        {format(new Date(selectedEvent.timestamp), 'd MMMM yyyy, HH:mm', { locale: ru })}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Основная информация</p>
                                    <p className="text-white/90 font-manrope text-base leading-relaxed">{selectedEvent.desc}</p>

                                    {selectedEvent.type === 'order' && selectedEvent.rawData?.items && (
                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                            {selectedEvent.rawData.items.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-sm font-manrope">
                                                    <span className="text-white/70 truncate mr-2">{item.name} <span className="text-white/30 ml-2">x{item.quantity}</span></span>
                                                    <span className="text-white font-bold whitespace-nowrap">{item.price * item.quantity} ₽</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 text-sm font-manrope">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-white/50">Статус:</span>
                                        <span className="text-white font-bold">{selectedEvent.rawData?.status || (selectedEvent.type === 'request' ? 'new' : 'unknown')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-white/50">ID:</span>
                                        <span className="text-white font-mono">{selectedEvent.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                {selectedEvent.type === 'request' && (
                                    <>
                                        <button
                                            onClick={() => openInAppChat(selectedEvent.rawData)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold/20 hover:bg-sparta-gold/30 text-sparta-gold border border-sparta-gold/30 py-3.5 px-6 rounded-xl font-bold transition-all font-manrope hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                                        >
                                            <MessageSquare size={18} />
                                            Написать
                                        </button>
                                        {(selectedEvent.rawData?.status === 'new' || !selectedEvent.rawData?.status) && (
                                            <button
                                                onClick={() => handleUpdateEventStatus(selectedEvent.id, 'requests', 'contacted')}
                                                className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold text-black py-3.5 px-6 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all font-manrope hover:scale-105"
                                            >
                                                <CheckCircle size={18} />
                                                В работу
                                            </button>
                                        )}
                                    </>
                                )}

                                {selectedEvent.type === 'order' && (
                                    <>
                                        <Link
                                            to="/admin/shop"
                                            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-3.5 px-6 rounded-xl font-bold transition-all font-manrope hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        >
                                            <ExternalLink size={18} />
                                            Перейти в магазин
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AdminDashboard;
