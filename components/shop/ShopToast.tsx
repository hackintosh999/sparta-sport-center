import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ShopToastProps {
    id?: string;
    message?: string;
    type?: ToastType;
    show?: boolean;
    onClose?: () => void;
}

export const ShopToast: React.FC<ShopToastProps> = ({ message, type = 'success', show = true, onClose }) => {
    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />;
            case 'error':
                return <AlertCircle size={18} className="text-red-400 flex-shrink-0" />;
            case 'warning':
                return <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />;
            case 'info':
            default:
                return <Info size={18} className="text-blue-400 flex-shrink-0" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success': return 'border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)]';
            case 'error': return 'border-red-500/30 shadow-[0_10px_30px_rgba(239,68,68,0.15)]';
            case 'warning': return 'border-yellow-500/30 shadow-[0_10px_30px_rgba(234,179,8,0.15)]';
            default: return 'border-white/10 shadow-2xl';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center gap-3 bg-[#161616]/95 backdrop-blur-xl border ${getBorderColor()} text-white px-4 py-3.5 rounded-2xl max-w-sm w-full`}
        >
            {getIcon()}
            <span className="text-xs sm:text-sm font-semibold text-gray-100 flex-1 leading-snug">
                {message || 'Товар добавлен в корзину'}
            </span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                >
                    <X size={15} />
                </button>
            )}
        </motion.div>
    );
};

export const ShopToastContainer: React.FC<{ toasts?: any[], onClose?: (id: string) => void, removeToast?: (id: string) => void }> = ({
    toasts = [],
    onClose,
    removeToast
}) => {
    const handleClose = (id: string) => {
        if (onClose) onClose(id);
        if (removeToast) removeToast(id);
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center space-y-2.5 pointer-events-none px-4 w-full max-w-md">
            <AnimatePresence>
                {toasts.map((toast: any) => (
                    <ShopToast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        show={true}
                        onClose={() => handleClose(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ShopToast;
