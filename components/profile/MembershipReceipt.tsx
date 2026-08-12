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
        type?: string;
        userName: string;
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

    return (
        <div className="bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-lg w-full font-manrope relative">
            {/* Design Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            {/* Branded Header */}
            <div className="bg-sparta-gold p-10 text-black text-center relative overflow-hidden">
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
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40">Membership Transaction</p>

                    <div className="mt-6 px-4 py-1.5 bg-black/10 rounded-full border border-black/10 flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Оплачено</span>
                    </div>
                </motion.div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 md:p-10">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-russo text-white uppercase tracking-wider mb-2">Подтверждение оплаты</h2>
                    <p className="text-white/40 text-xs font-medium">Транзакция успешно завершена</p>
                </div>

                {/* ID and Date - Grid Style */}
                <div className="grid grid-cols-2 gap-6 mb-10 p-6 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12" />
                    <div>
                        <p className="text-white/20 text-[9px] uppercase font-black tracking-[0.2em] mb-2">Номер чека</p>
                        <p className="text-white font-mono text-sm font-bold tracking-tight">#{order.id.slice(-12).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/20 text-[9px] uppercase font-black tracking-[0.2em] mb-2">Дата операции</p>
                        <p className="text-white text-xs font-bold">{formatDate(order.date)}</p>
                    </div>
                </div>

                {/* Information Sections */}
                <div className="space-y-6 mb-10">
                    {/* Buyer Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 border border-white/5">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-1">Покупатель</p>
                            <p className="text-white font-bold text-sm">{order.userName || 'Спортсмен Спарты'}</p>
                            <p className="text-white/40 text-[10px]">{order.email}</p>
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Operation Type / Plan */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 border border-white/5">
                            {order.type === 'topup' ? <Wallet size={20} /> : <Calendar size={20} />}
                        </div>
                        <div>
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-1">Детали операции</p>
                            <p className="text-white font-bold text-sm">
                                {order.type === 'topup' ? 'Пополнение баланса' : order.planTitle}
                            </p>
                            {order.duration > 0 && (
                                <p className="text-white/40 text-[10px]">{order.duration} мес. подписки</p>
                            )}
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Payment Method */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 border border-white/5">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-1">Способ оплаты</p>
                            <p className="text-white font-bold text-sm">
                                {order.paymentMethod === 'robokassa' ? 'Онлайн-касса' :
                                    order.paymentMethod === 'wallet' || order.paymentMethod === 'balance' ? 'Внутренний баланс' :
                                        order.paymentMethod === 'tbank' ? 'Т-Банк' : 'Банковская карта'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Section */}
                <div className="p-8 bg-gradient-to-br from-sparta-gold/10 to-transparent rounded-[2rem] border border-sparta-gold/20 flex justify-between items-center mb-10">
                    <div>
                        <p className="text-sparta-gold/60 text-[10px] uppercase font-black tracking-[0.3em] mb-1">Сумма к оплате</p>
                        <p className="text-white/20 text-[8px] uppercase tracking-widest">НДС включен (20%)</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-russo text-sparta-gold tracking-tighter">
                            {order.price.toLocaleString('ru-RU')} <span className="text-2xl ml-1 text-sparta-gold/60">₽</span>
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
