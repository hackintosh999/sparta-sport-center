import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, CreditCard, Wallet, Tag, Check, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

const CartSidebar = () => {
    const { isCartOpen, setIsCartOpen, cartItems, cartTotal, updateQuantity, removeFromCart, clearCart, showToast } = useCart();
    const { user } = useAuth();

    const [isProcessingBuy, setIsProcessingBuy] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [confirmCheckout, setConfirmCheckout] = useState<'balance' | 'robokassa' | null>(null);

    const checkAndApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                showToast('Промокод не найден', 'error');
                return;
            }

            const promoData = snap.docs[0].data();

            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия истек');
                showToast('Срок действия промокода истек', 'warning');
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Лимит исчерпан');
                showToast('Лимит использований промокода исчерпан', 'warning');
                return;
            }
            if (promoData.usersUsed && user && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали код');
                showToast('Вы уже использовали этот промокод', 'info');
                return;
            }
            if (promoData.type !== 'discount') {
                setPromoError('Код не дает скидку на сумму');
                return;
            }
            if (promoData.applicableTo === 'subscriptions') {
                setPromoError('Код действует только на подписки');
                return;
            }

            setAppliedPromo({ id: snap.docs[0].id, ...promoData });
            setPromoError('');
            showToast(`Промокод применен: -${promoData.value}%`, 'success');
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка при проверке');
            showToast('Ошибка при активации промокода', 'error');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const finalTotal = appliedPromo ? Math.floor(cartTotal * (1 - appliedPromo.value / 100)) : cartTotal;

    const handleCheckout = async (method: 'balance' | 'robokassa') => {
        if (!user) {
            showToast('Пожалуйста, войдите в систему', 'warning');
            return;
        }

        // Use internal state for confirmation instead of window.confirm
        if (!confirmCheckout || confirmCheckout !== method) {
            setConfirmCheckout(method);
            return;
        }

        setIsProcessingBuy(true);

        try {
            let userData = null;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                userData = userDoc.data();
            }

            if (method === 'balance') {
                const balance = userData?.walletBalance ?? userData?.balance ?? 0;
                if (balance < finalTotal) {
                    showToast('Недостаточно средств на балансе. Пополните его в личном кабинете.', 'error');
                    setIsProcessingBuy(false);
                    setConfirmCheckout(null);
                    return;
                }
            }

            const orderItems = cartItems.map(item => ({
                id: item.id,
                productId: item.productId,
                title: item.product.title,
                price: item.product.price,
                quantity: item.quantity,
                size: item.selectedSize || null,
                color: item.selectedColor || null,
                customName: item.customName || null,
                customNumber: item.customNumber || null,
                measurements: item.measurements || null,
                imageUrl: item.product.imageUrl || null,
            }));

            // Create Order
            const orderData = {
                userId: user.uid,
                email: user.email,
                userName: userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || 'Покупатель'),
                childName: userData?.childName || userData?.childFirstName || '', // Snapshot child name
                phone: userData?.parentPhone || userData?.phone || '', // Capture contact phone
                groupId: userData?.groupId || null, // Snapshot group for admin filtering
                groupName: userData?.groupName || null, // Snapshot group name
                items: orderItems,
                totalAmount: finalTotal,
                originalAmount: cartTotal,
                paymentMethod: method,
                status: method === 'balance' ? 'completed' : 'pending',
                type: 'shop_order',
                date: serverTimestamp(),
                createdAt: serverTimestamp(), // Consistency
                discountApplied: appliedPromo ? `promo:${appliedPromo.code}` : 'none',
                estimatedArrival: null, // To be filled by admin
            };

            const orderRef = await addDoc(collection(db, 'orders'), orderData);

            // Deduct balance if using internal balance
            if (method === 'balance') {
                const userRef = doc(db, 'users', user.uid);
                const currentBalance = userData?.walletBalance ?? userData?.balance ?? 0;
                await updateDoc(userRef, {
                    walletBalance: currentBalance - finalTotal,
                });

                // Add Notification
                await addDoc(collection(db, 'notifications'), {
                    email: user.email,
                    title: 'Заказ успешно оплачен! 🎉',
                    message: `Ваш заказ на сумму ${finalTotal} ₽ успешно оплачен с внутреннего баланса.`,
                    type: 'order',
                    isRead: false,
                    createdAt: serverTimestamp()
                });

                showToast('Заказ успешно оплачен! ✅', 'success');
                clearCart();
                setIsCartOpen(false);
            } else {
                // Direct Order Flow (Cash on pickup / SBP transfer)
                try {
                    await updateDoc(orderRef, { status: 'pending_transfer' });
                    await addDoc(collection(db, 'notifications'), {
                        email: user.email,
                        title: 'Заказ принят в обработку! 🛍️',
                        message: `Заказ #${orderRef.id.slice(-6).toUpperCase()} на сумму ${finalTotal} ₽ успешно оформлен. Оплата при получении или по СБП.`,
                        type: 'order',
                        isRead: false,
                        createdAt: serverTimestamp()
                    });
                    showToast('Заказ успешно оформлен! 🎉', 'success');
                    clearCart();
                    setIsCartOpen(false);
                } catch (err) {
                    console.error("Order error:", err);
                    showToast("Ошибка при сохранении заказа.", "error");
                }
            }

            // Update Promo usage if used
            if (appliedPromo && appliedPromo.id) {
                const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                const currentUses = appliedPromo.currentUses || 0;
                const usersUsed = appliedPromo.usersUsed || [];
                await updateDoc(promoRef, {
                    currentUses: currentUses + 1,
                    usersUsed: [...usersUsed, user.uid]
                });

                // Log Activation for Admin History
                await addDoc(collection(db, 'promo_activations'), {
                    userId: user.uid,
                    promoId: appliedPromo.id,
                    code: appliedPromo.code,
                    type: appliedPromo.type,
                    value: appliedPromo.value,
                    timestamp: serverTimestamp()
                });
            }

        } catch (error) {
            console.error("Checkout error", error);
            showToast("Произошла ошибка при оформлении заказа.", "error");
        } finally {
            setIsProcessingBuy(false);
            setConfirmCheckout(null);
        }
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#1a1a1a] shadow-2xl z-50 border-l border-white/10 flex flex-col font-manrope"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-russo uppercase text-white tracking-widest">Корзина</h2>
                                <p className="text-gray-400 text-sm">{cartItems.length} товаров</p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <Tag className="mb-4 opacity-20" size={64} />
                                    <p className="text-xl font-bold">Корзина пуста</p>
                                    <p className="text-sm mt-2">Добавьте товары из магазина</p>
                                </div>
                            ) : (
                                cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-start bg-[#111] p-4 rounded-2xl border border-white/5 group">
                                        {/* Image */}
                                        <div className="w-24 h-24 bg-[#0a0a0a] rounded-xl overflow-hidden flex-shrink-0">
                                            {item.product.imageUrl ? (
                                                <img src={item.product.imageUrl} alt={item.product.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/20"><Tag size={32} /></div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-bold leading-tight line-clamp-2">{item.product.title}</h3>

                                            <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-2">
                                                {item.selectedSize && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{item.selectedSize}</span>}
                                                {item.selectedColor && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{item.selectedColor}</span>}
                                                {item.customName && <span className="text-yellow-500 font-black uppercase text-[10px] bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">{item.customName}</span>}
                                                {item.customNumber && <span className="text-yellow-500 font-black text-[10px] bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">#{item.customNumber}</span>}
                                                {item.measurements && Object.entries(item.measurements).some(([_, v]) => v) && (
                                                    <div className="flex flex-wrap gap-1 mt-1 w-full">
                                                        {Object.entries(item.measurements).map(([key, val]) => {
                                                            const labels: Record<string, string> = {
                                                                height: 'Рост',
                                                                chest: 'Грудь',
                                                                shoulders: 'Плечи',
                                                                sleeve: 'Рукав',
                                                                waist: 'Талия',
                                                                hips: 'Бедра',
                                                                length: 'Длина'
                                                            };
                                                            return val && (
                                                                <span key={key} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 border border-white/5 whitespace-nowrap">
                                                                    {labels[key] || key}: {String(val)}см
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {item.fitStyle && <div className="text-[10px] text-yellow-500/60 font-bold uppercase tracking-wider mt-1 w-full">Силуэт: {item.fitStyle}</div>}
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="font-mono text-yellow-500 font-bold">
                                                    {(item.product.price * item.quantity).toLocaleString()} ₽
                                                </div>

                                                <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg border border-white/10 p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-all"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-6 text-center text-white text-sm font-bold">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-all"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Checkout */}
                        {cartItems.length > 0 && (
                            <div className="p-6 border-t border-white/5 bg-[#111] z-10 relative">

                                {/* Promo Code */}
                                <div className="mb-6">
                                    {appliedPromo ? (
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                                                <Check size={16} /> Промокод {appliedPromo.code} (-{appliedPromo.value}%)
                                            </div>
                                            <button onClick={() => setAppliedPromo(null)} className="text-gray-400 hover:text-red-400">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Промокод"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value)}
                                                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 flex-1 text-white placeholder-gray-500 outline-none focus:border-yellow-500 uppercase font-mono text-sm tracking-wider"
                                            />
                                            <button
                                                onClick={checkAndApplyPromo}
                                                disabled={isApplyingPromo || !promoCode.trim()}
                                                className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center w-24"
                                            >
                                                {isApplyingPromo ? <Loader2 className="animate-spin" size={16} /> : "ОК"}
                                            </button>
                                        </div>
                                    )}
                                    {promoError && <p className="text-red-400 text-xs mt-2 ml-1 font-bold">{promoError}</p>}
                                </div>

                                {/* Summary */}
                                <div className="space-y-2 mb-6 text-sm">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Товары ({cartItems.length})</span>
                                        <span className="font-mono">{cartTotal.toLocaleString()} ₽</span>
                                    </div>
                                    {appliedPromo && (
                                        <div className="flex justify-between text-green-400 font-bold">
                                            <span>Скидка</span>
                                            <span className="font-mono">-{(cartTotal - finalTotal).toLocaleString()} ₽</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-white text-xl font-bold pt-2 border-t border-white/5 mt-2">
                                        <span>Итого</span>
                                        <span className="font-mono text-yellow-500">{finalTotal.toLocaleString()} ₽</span>
                                    </div>
                                </div>

                                {/* Checkout Buttons */}
                                <div className="space-y-3">
                                    <button
                                        disabled={isProcessingBuy}
                                        onClick={() => handleCheckout('balance')}
                                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border ${confirmCheckout === 'balance'
                                            ? 'bg-yellow-500 text-black border-yellow-500 animate-pulse'
                                            : 'bg-[#1a1a1a] text-white border-white/10 hover:bg-white/5'
                                            }`}
                                    >
                                        <Wallet size={20} />
                                        {confirmCheckout === 'balance' ? 'Подтвердить оплату?' : 'Купить с Баланса'}
                                    </button>

                                    <button
                                        disabled={isProcessingBuy}
                                        onClick={() => handleCheckout('robokassa')}
                                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${confirmCheckout === 'robokassa'
                                            ? 'bg-yellow-500 text-black animate-pulse'
                                            : 'bg-white text-black hover:bg-white/90'
                                            }`}
                                    >
                                        {isProcessingBuy ? (
                                            <Loader2 className="animate-spin" />
                                        ) : confirmCheckout === 'robokassa' ? (
                                            'Уверены? Перейти к оплате'
                                        ) : (
                                            <><CreditCard size={20} /> Оплатить Картой</>
                                        )}
                                    </button>

                                    {confirmCheckout && (
                                        <button
                                            onClick={() => setConfirmCheckout(null)}
                                            className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors"
                                        >
                                            Отмена
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;
