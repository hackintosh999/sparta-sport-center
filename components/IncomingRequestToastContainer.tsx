import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserPlus, Check, X, Shield, Trophy } from 'lucide-react';
import { useNotificationContext, IncomingRequestNotification } from '../context/NotificationContext';

const ToastItem: React.FC<{ request: IncomingRequestNotification }> = ({ request }) => {
    const { acceptRequest, declineRequest, dismissToast } = useNotificationContext();

    const getRoleBadge = (role?: string) => {
        const r = (role || '').toLowerCase();
        if (['trainer', 'coach'].includes(r)) {
            return { text: 'Тренер', bg: 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30', icon: <Shield size={10} /> };
        }
        if (['admin', 'director', 'developer', 'dev'].includes(r)) {
            return { text: 'Админ', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Shield size={10} /> };
        }
        if (r === 'parent') {
            return { text: 'Родитель', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: null };
        }
        return { text: 'Атлет', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <Trophy size={10} /> };
    };

    const roleBadge = getRoleBadge(request.senderRole);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="pointer-events-auto relative w-80 sm:w-96 bg-[#15171C]/90 backdrop-blur-2xl border border-sparta-gold/40 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(234,179,8,0.15)] rounded-2xl p-4 overflow-hidden select-none"
        >
            {/* Ambient Gold Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sparta-gold/20 via-sparta-gold to-sparta-gold/20 animate-pulse" />

            {/* Close / Dismiss Icon */}
            <button
                onClick={() => dismissToast(request.requestId)}
                className="absolute top-3 right-3 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                title="Закрыть"
            >
                <X size={14} />
            </button>

            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sparta-gold/30 to-black border border-sparta-gold/40 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                        {request.senderAvatar ? (
                            <img src={request.senderAvatar} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <User className="text-sparta-gold" size={22} />
                        )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-sparta-gold text-black rounded-full p-0.5 border border-black shadow">
                        <UserPlus size={9} strokeWidth={3} />
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h4 className="text-xs font-bold text-white truncate max-w-[170px]">
                            {request.senderName}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 ${roleBadge.bg}`}>
                            {roleBadge.icon}
                            {roleBadge.text}
                        </span>
                    </div>
                    <p className="text-[11px] text-sparta-gold/90 font-medium">
                        Отправил(а) вам запрос в друзья
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
                <button
                    onClick={() => acceptRequest(request)}
                    className="flex-1 py-1.5 px-3 bg-sparta-gold hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sparta-gold/20"
                >
                    <Check size={13} strokeWidth={3} />
                    Принять
                </button>
                <button
                    onClick={() => declineRequest(request.requestId)}
                    className="py-1.5 px-3 bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/10 hover:border-red-500/30 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1"
                >
                    <X size={13} />
                    Отклонить
                </button>
            </div>
        </motion.div>
    );
};

const IncomingRequestToastContainer: React.FC = () => {
    const { activeToasts } = useNotificationContext();

    return (
        <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-3 max-w-full">
            <AnimatePresence mode="sync">
                {activeToasts.map(req => (
                    <ToastItem key={req.requestId} request={req} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default IncomingRequestToastContainer;
