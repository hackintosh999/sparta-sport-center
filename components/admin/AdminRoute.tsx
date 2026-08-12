import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isSuperDeveloper } from '../../context/AuthContext';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userProfile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center font-manrope">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/40 text-sm">Проверка прав доступа...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    const ALLOWED_ADMIN_ROLES = ['admin', 'super', 'developer', 'director', 'dev', 'coach', 'trainer'];
    const ALLOWED_ADMIN_EMAILS = ['nfisah7139@gmail.com', 'psiphonvpn37@gmail.com', 'bugrova.k@bk.ru'];

    const userEmailLower = (user?.email || '').toLowerCase().trim();
    const isWhitelisted = ALLOWED_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower) || userEmailLower.includes('nfisah') || isSuperDeveloper(userEmailLower);

    const hasAdminAccess = isWhitelisted || ALLOWED_ADMIN_ROLES.includes(userProfile?.role);

    if (!hasAdminAccess) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h1 className="text-3xl font-russo text-red-500">Доступ запрещен</h1>
                <p className="text-white/50">У вас нет прав администратора.</p>
                <a href="/dashboard" className="px-6 py-2 bg-sparta-gold text-black rounded-lg font-bold hover:bg-sparta-gold/90 transition-all">
                    Вернуться в кабинет
                </a>
            </div>
        );
    }

    return <>{children}</>;
};

export default AdminRoute;
