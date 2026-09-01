import { Link, Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { Users, FileText, MessageSquare, LogOut, Home, Settings, Newspaper, MessageCircle, Calendar, Layers, Tag, Disc, ShoppingBag, Trophy, ShieldAlert, Menu, X, Video, ArrowLeft, Star, Wallet, QrCode, TrendingUp, User, MapPin, CreditCard } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


const AdminLayout = () => {
    const { logout, userProfile } = useAuth();
    const isDirector = userProfile?.role === 'director' || userProfile?.role === 'developer';
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

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
                { path: '/admin/scanner', icon: QrCode, label: 'QR-Сканер' },
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
                                <span className="truncate text-sm">{item.label}</span>
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
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-dark border-b border-card-border/5 flex items-center justify-between px-6 z-40">
                <h1 className="text-xl font-russo text-sparta-gold uppercase">SPARTA</h1>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-white/5 rounded-lg text-white"
                >
                    <Menu size={24} />
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
                            className="fixed inset-y-0 left-0 w-[280px] bg-surface-dark border-r border-card-border/5 flex flex-col z-[70] lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'blur-sm lg:blur-none' : ''} lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8`}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;