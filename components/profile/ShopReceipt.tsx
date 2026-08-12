import React from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, ShieldCheck, Calendar, CreditCard, User, Tag, MapPin, Clock, ShoppingBag, Truck, ExternalLink, Package, Receipt } from 'lucide-react';
import { Button } from '../UIComponents';
import { Order } from '../../types/shop';

interface ShopReceiptProps {
    order: Order;
    onClose: () => void;
}

const ShopReceipt: React.FC<ShopReceiptProps> = ({ order, onClose }) => {
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

    const firstItem = order.items?.[0];

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
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40">Official Digital Receipt</p>

                    <div className="mt-6 px-4 py-1.5 bg-black/10 rounded-full border border-black/10 flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Оплачено</span>
                    </div>
                </motion.div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 md:p-10">
                {/* Visual Image Centerpiece */}
                <div className="mb-10 relative group">
                    <div className="absolute inset-0 bg-sparta-gold/10 blur-3xl rounded-full opacity-50" />
                    <div className="relative aspect-square max-w-[200px] mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white/5">
                        {firstItem?.imageUrl ? (
                            <img
                                src={firstItem.imageUrl}
                                alt={firstItem.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10">
                                <ShoppingBag size={64} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-2xl font-russo text-white uppercase tracking-wider mb-2">Спасибо за покупку!</h2>
                    <p className="text-white/40 text-xs font-medium">Ваш заказ успешно сформирован и передан в работу</p>
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
                        <p className="text-white text-xs font-bold">{formatDate(order.createdAt || order.date)}</p>
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
                            {order.userEmail && <p className="text-white/40 text-[10px]">{order.userEmail}</p>}
                        </div>
                    </div>

                    {/* Dashed Divider */}
                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Order Items */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Tag size={14} className="text-sparta-gold" />
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest">Состав заказа</p>
                        </div>
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-6 group">
                                <div className="min-w-0">
                                    <p className="text-white text-sm font-bold group-hover:text-sparta-gold transition-colors">{item.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-white/30 text-[10px] font-bold px-1.5 py-0.5 bg-white/5 rounded-md">{item.quantity} шт.</span>
                                        {item.size && <span className="text-white/30 text-[10px] font-bold px-1.5 py-0.5 bg-white/5 rounded-md">{item.size}</span>}
                                        {item.color && <span className="text-white/30 text-[10px] font-bold px-1.5 py-0.5 bg-white/5 rounded-md">{item.color}</span>}
                                    </div>
                                </div>
                                <p className="text-white font-russo text-sm shrink-0">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</p>
                            </div>
                        ))}
                    </div>

                    {/* Dashed Divider */}
                    <div className="h-px w-full border-t border-dashed border-white/10 my-2" />

                    {/* Delivery & Payment */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                                <Truck size={10} /> Статус
                            </p>
                            <p className="text-white font-bold text-xs">
                                {order.status === 'delivered' ? 'Доставлено' :
                                    order.status === 'shipped' ? 'В пути' :
                                        order.status === 'ready_for_pickup' ? 'К выдаче' :
                                            'В обработке'}
                            </p>
                        </div>
                        <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                                <CreditCard size={10} /> Оплата
                            </p>
                            <p className="text-white font-bold text-xs">
                                {order.paymentMethod === 'balance' ? 'Баланс' : 'Картой'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Section */}
                <div className="p-8 bg-gradient-to-br from-sparta-gold/10 to-transparent rounded-[2rem] border border-sparta-gold/20 flex justify-between items-center mb-10">
                    <div>
                        <p className="text-sparta-gold/60 text-[10px] uppercase font-black tracking-[0.3em] mb-1">Итого к оплате</p>
                        <p className="text-white/20 text-[8px] uppercase tracking-widest">НДС включен (20%)</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-russo text-sparta-gold tracking-tighter">
                            {(order.totalAmount || order.price || 0).toLocaleString('ru-RU')} <span className="text-2xl ml-1 text-sparta-gold/60">₽</span>
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
                        Скачать
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

export default ShopReceipt;
