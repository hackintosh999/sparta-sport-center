import React from 'react';
import {
    LayoutDashboard, Users, CreditCard, MessageSquare, User,
    Flame, Trophy, TrendingUp, Activity, Bell, Home, Terminal, ShoppingBag
} from 'lucide-react';
import { UserItem } from '../../types/user';

interface DashboardShellProps {
    user: any;
    userProfile: UserItem | null;
    activeTab: string;
    onTabChange: (tab: string) => void;
    unreadNotificationsCount?: number;
    onOpenNotifications?: () => void;
    onGoToMainSite?: () => void;
    children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
    user,
    userProfile,
    activeTab,
    onTabChange,
    unreadNotificationsCount = 0,
    onOpenNotifications,
    onGoToMainSite,
    children
}) => {
    const role = userProfile?.role || 'user';
    const isStaff = role === 'admin' || role === 'director' || role === 'coach' || role === 'trainer' || role === 'developer' || role === 'dev';
    const isParent = role === 'parent';

    // Role-tailored mobile bottom navigation items
    const getMobileNavItems = () => {
        if (isParent) {
            return [
                { id: 'family', label: 'Семья', icon: Users },
                { id: 'subscriptions', label: 'Абонементы', icon: CreditCard },
                { id: 'messages_unified', label: 'Сообщения', icon: MessageSquare },
                { id: 'profile', label: 'Профиль', icon: User },
            ];
        }

        if (isStaff) {
            if (role === 'developer' || role === 'dev') {
                return [
                    { id: 'analytics', label: 'Пульт', icon: Terminal },
                    { id: 'requests', label: 'Сводка', icon: LayoutDashboard },
                    { id: 'messages_unified', label: 'Чат', icon: MessageSquare },
                    { id: 'profile', label: 'Профиль', icon: User },
                ];
            }
            if (role === 'director' || role === 'admin') {
                return [
                    { id: 'requests', label: 'Сводка', icon: LayoutDashboard },
                    { id: 'analytics', label: 'Аналитика', icon: TrendingUp },
                    { id: 'coaching', label: 'Команда', icon: Users },
                    { id: 'messages_unified', label: 'Чат', icon: MessageSquare },
                    { id: 'profile', label: 'Профиль', icon: User },
                ];
            }
            // Coach / Trainer
            return [
                { id: 'coaching', label: 'Команда', icon: Users },
                { id: 'analytics', label: 'Аналитика', icon: Activity },
                { id: 'messages_unified', label: 'Чат', icon: MessageSquare },
                { id: 'profile', label: 'Профиль', icon: User },
            ];
        }

        // Student / Athlete
        return [
            { id: 'requests', label: 'Дневник', icon: Flame },
            { id: 'achievements', label: 'Награды', icon: Trophy },
            { id: 'orders', label: 'Призы', icon: ShoppingBag },
            { id: 'messages_unified', label: 'Чат', icon: MessageSquare },
            { id: 'profile', label: 'Профиль', icon: User },
        ];
    };

    const navItems = getMobileNavItems();

    return (
        <div className="min-h-screen bg-[#070707] text-white flex flex-col relative overflow-x-hidden">
            {/* Mobile Top App Bar */}
            <header className="md:hidden sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/10 h-14 flex items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                    {onGoToMainSite && (
                        <button
                            onClick={onGoToMainSite}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white/80 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 active:scale-95 transition-all"
                        >
                            <Home size={13} className="text-sparta-gold" />
                            <span className="uppercase text-[9px] tracking-wider font-black">Сайт</span>
                        </button>
                    )}
                    <span
                        onClick={() => onTabChange('requests')}
                        className="font-russo text-sparta-gold text-sm tracking-widest uppercase cursor-pointer"
                    >
                        SPARTA
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {onOpenNotifications && (
                        <button
                            onClick={onOpenNotifications}
                            className="relative p-2 text-white/70 hover:text-white transition-colors rounded-xl bg-white/5 border border-white/5"
                        >
                            <Bell size={17} />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-sparta-gold rounded-full animate-pulse" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => onTabChange('profile')}
                        className="w-8 h-8 rounded-full border border-sparta-gold/50 overflow-hidden bg-white/5 flex items-center justify-center text-xs font-bold text-sparta-gold active:scale-95 transition-all"
                    >
                        {(userProfile?.photoUrl || user?.photoURL) ? (
                            <img
                                src={userProfile?.photoUrl || user?.photoURL}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span>{(userProfile?.childName || userProfile?.name || user?.email || 'U').charAt(0).toUpperCase()}</span>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pb-24 md:pb-8">
                {children}
            </main>
        </div>
    );
};

export default DashboardShell;
