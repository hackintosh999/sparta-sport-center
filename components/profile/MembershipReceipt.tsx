import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, CheckCircle2, ShieldCheck, Calendar, CreditCard, User, Hash, ArrowRight, Wallet, Receipt } from 'lucide-react';
import { Button } from '../UIComponents';

interface MembershipReceiptProps {
    order: {
        id: string;
        date: any;
        planTitle: string;
        price: number;
        duration: number;
        paymentMethod: string;
        status?: string;
        type?: string;
        userName: string;
        childName?: string;
        email: string;
    };
    onClose: () => void;
}

const MembershipReceipt: React.FC<MembershipReceiptProps> = ({ order, onClose }) => {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Неизвестно';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownload = () => {
        window.print();
    };

    const isPendingTransfer = order.status === 'pending_transfer' || order.status === 'pending_robokassa';
    const isPendingCash = order.status === 'pending_cash';
    const isPendingInvoice = order.status === 'pending_invoice';

    const getPaymentMethodLabel = () => {
        if (order.paymentMethod === 'sbp') return 'Перевод по СБП / Сбербанк';
        if (order.paymentMethod === 'cash') return 'Наличными на тренировке';
        if (order.paymentMethod === 'invoice') return 'Оплата по счёту (ИП/ООО)';
        if (order.paymentMethod === 'balance' || order.paymentMethod === 'wallet') return 'Внутренний баланс';
        if (order.paymentMethod === 'robokassa') return 'Онлайн-оплата';
        return order.paymentMethod || 'Перевод';
    };

    return (
        <div className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-lg w-full font-manrope relative">
            {/* Design Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            {/* Branded Header */}
            <div className={`p-8 text-black text-center relative overflow-hidden ${
                isPendingCash ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                isPendingTransfer ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                'bg-sparta-gold'
            }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="relative z-10 flex flex-col items-center"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-sparta-gold shadow-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <h1 className="font-russo text-4xl tracking-tighter uppercase">SPARTA</h1>
                    </div>
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-50">
                        {isPendingCash ? 'Group Reservation Slip' : isPendingTransfer ? 'Transfer Confirmation Request' : 'Membership Transaction'}
                    </p>

                    <div className="mt-4 px-4 py-1.5 bg-black/15 rounded-full border border-black/15 flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isPendingCash ? 'Место забронировано' : isPendingTransfer ? 'Ожидает проверки перевода' : isPendingInvoice ? 'Счёт сформирован' : 'Оплачено'}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Receipt Body */}
            <div className="p-6 md:p-8">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-russo text-white uppercase tracking-wider mb-1">
                        {isPendingCash ? 'Бронирование места' : isPendingTransfer ? 'Заявка на активацию' : isPendingInvoice ? 'Счёт на оплату' : 'Подтверждение оплаты'}
                    </h2>
                    <p className="text-white/50 text-xs font-medium">
                        {isPendingCash ? 'Оплата наличными тренеру перед началом занятия' :
                         isPendingTransfer ? 'Администратор подтвердит получение средств в течение 5–15 минут' :
                         'Транзакция успешно зафиксирована'}
                    </p>
                </div>

                {/* ID and Date - Grid Style */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                    <div>
                        <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.2em] mb-1">Номер заявки</p>
                        <p className="text-white font-mono text-xs font-bold tracking-tight">#{order.id.slice(-10).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.2em] mb-1">Дата операции</p>
                        <p className="text-white text-xs font-bold">{formatDate(order.date)}</p>
                    </div>
                </div>

                {/* Information Sections */}
                <div className="space-y-4 mb-6 text-xs">
                    {/* Buyer Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 border border-white/5 shrink-0">
                            <User size={18} />
                        </div>
                        <div>
                            <p className="text-white/30 text-[9px] uppercase font-black tracking-widest mb-0.5">Спортсмен / Родитель</p>
                            <p className="text-white font-bold">{order.childName ? `${order.childName} (Родитель: ${order.userName})` : order.userName || 'Спортсмен Спарты'}</p>
                            <p className="text-white/40 text-[11px]">{order.email}</p>
                        </div>
                    </div>

                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Operation Type / Plan */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-amber-400 border border-white/5 shrink-0">
                            {order.type === 'topup' ? <Wallet size={18} /> : <Calendar size={18} />}
                        </div>
                        <div>
                            <p className="text-white/30 text-[9px] uppercase font-black tracking-widest mb-0.5">Тариф программы</p>
                            <p className="text-white font-bold">
                                {order.type === 'topup' ? 'Пополнение баланса' : order.planTitle}
                            </p>
                            {order.duration > 0 && (
                                <p className="text-amber-400/80 text-[11px] font-medium">{order.duration} мес. обучения</p>
                            )}
                        </div>
                    </div>

                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Payment Method */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 border border-white/5 shrink-0">
                            <CreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-white/30 text-[9px] uppercase font-black tracking-widest mb-0.5">Способ оплаты</p>
                            <p className="text-white font-bold">{getPaymentMethodLabel()}</p>
                        </div>
                    </div>
                </div>

                {/* Total Section */}
                <div className="p-5 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl border border-amber-500/20 flex justify-between items-center mb-6">
                    <div>
                        <p className="text-amber-400/70 text-[9px] uppercase font-black tracking-[0.2em] mb-0.5">Сумма</p>
                        <p className="text-white/30 text-[8px] uppercase tracking-widest">Без комиссий</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-russo text-amber-400 tracking-tight">
                            {order.price.toLocaleString('ru-RU')} <span className="text-xl ml-0.5 text-amber-400/60">₽</span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 print:hidden">
                    <button
                        onClick={handleDownload}
                        className="flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                        <Download size={18} className="text-sparta-gold" />
                        PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 bg-sparta-gold text-black rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-xl shadow-sparta-gold/10"
                    >
                        Закрыть
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-black/40 p-6 text-center border-t border-white/5">
                <div className="flex items-center justify-center gap-3 text-white/20 text-[9px] uppercase font-black tracking-[0.3em]">
                    <ShieldCheck size={14} className="text-sparta-gold/40" />
                    <span>SPARTA DIGITAL SECURITY • VALID RECEIPT</span>
                </div>
            </div>
        </div>
    );
};

export default MembershipReceipt;
