import { Link, Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { Users, FileText, MessageSquare, LogOut, Home, Settings, Newspaper, MessageCircle, Calendar, Layers, Tag, Disc, ShoppingBag, Trophy, ShieldAlert, Menu, X, Video, ArrowLeft, Star, Wallet, QrCode, TrendingUp, User, MapPin, CreditCard } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';


const AdminLayout = () => {
    const { logout, userProfile } = useAuth();
    const isDirector = userProfile?.role === 'director' || userProfile?.role === 'developer';
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newRequestsCount, setNewRequestsCount] = useState(0);
    const location = useLocation();

    // Live subscription to unhandled requests
    useEffect(() => {
        const q = query(collection(db, 'requests'), where('status', '==', 'new'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const count = snapshot.docs.filter(d => !d.data().isDeleted).length;
            setNewRequestsCount(count);
        }, (err) => {
            console.warn('AdminLayout new requests listener warning:', err);
        });
        return () => unsubscribe();
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const navCategories = [
        {
            title: "Управление",
            items: [
                { path: '/admin', icon: Home, label: 'Обзор' },
                { path: '/admin/director', icon: TrendingUp, label: 'Панель Директора' },
                // { path: '/admin/scanner', icon: QrCode, label: 'QR-Сканер' }, // Скрыто из сайдбара для разгрузки меню (маршрут /admin/scanner сохранен)
                { path: '/admin/requests', icon: FileText, label: 'Заявки' },
                { path: '/admin/groups', icon: Calendar, label: 'Группы' },
                { path: '/admin/users', icon: Users, label: 'Пользователи' },
            ]
        },
        {
            title: "Контент",
            items: [
                { path: '/admin/locations', icon: MapPin, label: 'Залы и Адреса' },
                { path: '/admin/news', icon: Newspaper, label: 'Новости' },
                { path: '/admin/broadcasts', icon: Video, label: 'Трансляции' },
                { path: '/admin/reviews', icon: Star, label: 'Отзывы' },
                { path: '/admin/directions', icon: Layers, label: 'Направления' },
                { path: '/admin/team', icon: Users, label: 'Команда' },
                { path: '/admin/achievements', icon: Trophy, label: 'Награды' },
            ]
        },
        {
            title: "Коммерция",
            items: [
                { path: '/admin/subscriptions', icon: CreditCard, label: 'Абонементы' },
                { path: '/admin/shop', icon: ShoppingBag, label: 'Магазин' },
                { path: '/admin/finance', icon: Wallet, label: 'Финансы' },
                { path: '/admin/promos', icon: Tag, label: 'Промокоды' },
            ]
        },
        {
            title: "Система",
            items: [
                { path: '/admin/messages', icon: MessageSquare, label: 'Сообщения' },
                { path: '/admin/comments', icon: MessageCircle, label: 'Модерация' },
                { path: '/admin/bans', icon: ShieldAlert, label: 'Бан-лист' },
                { path: '/admin/settings', icon: Settings, label: 'Настройки' },
            ]
        }
    ].map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
            if (item.path === '/admin/finance') return isDirector;
            return true;
        })
    }));


    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-russo text-sparta-gold uppercase">SPARTA</h1>
                    <span className="text-white text-xs block font-manrope opacity-50">Admin Panel</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden text-secondary hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 p-4 pb-20 space-y-6 overflow-y-auto custom-scrollbar">
                {navCategories.map((category, idx) => (
                    <div key={idx} className="space-y-1">
                        <h3 className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-2 mt-2">
                            {category.title}
                        </h3>
                        {category.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin'}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all
                                    ${isActive
                                        ? 'bg-sparta-gold text-black font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                        : 'text-secondary hover:bg-white/5 hover:text-white'}
                                `}
                            >
                                <item.icon size={18} />
                                <span className="truncate text-sm flex-1">{item.label}</span>
                                {item.path === '/admin/requests' && newRequestsCount > 0 && (
                                    <span className="px-2 py-0.5 text-[11px] font-black bg-red-500 text-white rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                                        {newRequestsCount}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2">
                <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white rounded-xl transition-all"
                >
                    <ArrowLeft size={18} />
                    <span>На сайт</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    <span>Выйти</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="dashboard-theme min-h-screen bg-surface flex font-manrope overflow-x-hidden">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-surface-dark border-b border-card-border/5 flex items-center justify-between px-4 sm:px-6 z-40">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-russo text-sparta-gold uppercase">SPARTA</h1>
                    {newRequestsCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black bg-red-500 text-white rounded-full animate-pulse">
                            +{newRequestsCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-white/5 rounded-lg text-white relative cursor-pointer"
                    aria-label="Открыть меню"
                >
                    <Menu size={22} className="sm:w-6 sm:h-6" />
                    {newRequestsCount > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-1 right-1 border-2 border-surface-dark animate-pulse" />
                    )}
                </button>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-surface-dark border-r border-card-border/5 flex-col fixed h-full z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
                        />
                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-surface-dark border-r border-card-border/5 flex flex-col z-[70] lg:hidden pt-safe pb-safe"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'blur-sm lg:blur-none' : ''} lg:ml-64 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] lg:pt-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 p-3 sm:p-4 lg:p-8`}>
                <Outlet />
            </main>

            {/* Admin Mobile Bottom Navigation Dock */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c10]/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between w-full max-w-lg mx-auto">
                    {/* Обзор */}
                    <button
                        onClick={() => navigate('/admin')}
                        className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${location.pathname === '/admin' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${location.pathname === '/admin' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                            <Home size={18} className={location.pathname === '/admin' ? 'text-sparta-gold' : 'text-white/50'} />
                        </div>
                        <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${location.pathname === '/admin' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Обзор</span>
                    </button>

                    {/* Заявки */}
                    <button
                        onClick={() => navigate('/admin/requests')}
                        className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${location.pathname.startsWith('/admin/requests') ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <div className={`relative p-1.5 rounded-xl transition-all ${location.pathname.startsWith('/admin/requests') ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                            <FileText size={18} className={location.pathname.startsWith('/admin/requests') ? 'text-sparta-gold' : 'text-white/50'} />
                            {newRequestsCount > 0 && (
                                <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                                    {newRequestsCount}
                                </span>
                            )}
                        </div>
                        <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${location.pathname.startsWith('/admin/requests') ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Заявки</span>
                    </button>

                    {/* QR Сканер (Турникет на ресепшн) */}
                    <button
                        onClick={() => navigate('/admin/scanner')}
                        className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                        title="QR-Сканер пропусков"
                    >
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all ${location.pathname === '/admin/scanner' ? 'ring-2 ring-sparta-gold scale-105' : ''}`}>
                            <QrCode size={22} className="text-black stroke-[2.5]" />
                        </div>
                        <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">Сканер</span>
                    </button>

                    {/* Пользователи */}
                    <button
                        onClick={() => navigate('/admin/users')}
                        className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${location.pathname.startsWith('/admin/users') ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${location.pathname.startsWith('/admin/users') ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                            <Users size={18} className={location.pathname.startsWith('/admin/users') ? 'text-sparta-gold' : 'text-white/50'} />
                        </div>
                        <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${location.pathname.startsWith('/admin/users') ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Люди</span>
                    </button>

                    {/* Меню / Все разделы */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${isSidebarOpen ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${isSidebarOpen ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                            <Menu size={18} className={isSidebarOpen ? 'text-sparta-gold' : 'text-white/50'} />
                        </div>
                        <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${isSidebarOpen ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Меню</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default AdminLayout;