import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isSuperDeveloper } from '../../context/AuthContext';

const DirectorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userProfile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center font-manrope">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/40 text-sm">Проверка уровня доступа...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    const ALLOWED_DIRECTOR_ROLES = ['director', 'super', 'developer', 'dev', 'admin'];
    const ALLOWED_DIRECTOR_EMAILS = ['nfisah7139@gmail.com', 'psiphonvpn37@gmail.com', 'bugrova.k@bk.ru'];

    const userEmailLower = (user?.email || '').toLowerCase().trim();
    const isWhitelisted = ALLOWED_DIRECTOR_EMAILS.some(e => e.toLowerCase() === userEmailLower) || userEmailLower.includes('nfisah') || isSuperDeveloper(userEmailLower);

    const hasDirectorAccess = isWhitelisted || ALLOWED_DIRECTOR_ROLES.includes(userProfile?.role);

    if (!hasDirectorAccess) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center gap-6 p-6 text-center font-manrope">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <h1 className="text-4xl font-russo text-white uppercase tracking-wider">Доступ ограничен</h1>
                <div className="max-w-md space-y-2">
                    <p className="text-white/70 text-lg font-bold">Этот раздел доступен только для Директора.</p>
                    <p className="text-white/30 text-sm">Если вы считаете, что это ошибка, пожалуйста, обратитесь к администратору.</p>
                </div>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all"
                >
                    Вернуться назад
                </button>
            </div>
        );
    }

    return <>{children}</>;
};

export default DirectorRoute;