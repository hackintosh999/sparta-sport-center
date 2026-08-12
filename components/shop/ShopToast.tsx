import React from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ShopToastProps {
    message?: string;
    type?: ToastType;
    show?: boolean;
    onClose?: () => void;
}

export const ShopToast: React.FC<ShopToastProps> = ({ message, show, onClose }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center justify-between">
            <span>{message || 'Товар добавлен в корзину'}</span>
            {onClose && (
                <button onClick={onClose} className="ml-3 text-white font-bold">&times;</button>
            )}
        </div>
    );
};

export const ShopToastContainer: React.FC<any> = ({ toasts = [], removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
            {toasts.map((toast: any) => (
                <ShopToast
                    key={toast.id}
                    message={toast.message}
                    show={true}
                    onClose={() => removeToast && removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default ShopToast;
