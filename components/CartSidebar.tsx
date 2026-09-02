import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, CreditCard, Wallet, Tag, Check, Loader2, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc, increment, onSnapshot } from 'firebase/firestore';
import SpartaCoinIcon from './SpartaCoinIcon';
import { useSpartaCoinsEconomy, formatCoins, formatRubles } from '../utils/spartaCoins';

const CartSidebar = () => {
    const { isCartOpen, setIsCartOpen, cartItems, cartTotal, updateQuantity, removeFromCart, clearCart, showToast } = useCart();
    const { user, userProfile } = useAuth();
    const { exchangeRate, maxDiscountPercent, rublesToCoins } = useSpartaCoinsEconomy();

    const [liveCoins, setLiveCoins] = useState<number>(Number(userProfile?.coins ?? userProfile?.spartCoins ?? userProfile?.stats?.coins ?? 0));

    useEffect(() => {
        if (!user) return;
        const studentId = userProfile?.studentId || userProfile?.childId || user.uid;
        const unsub = onSnapshot(doc(db, 'students', studentId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveCoins(Number(data.stats?.coins ?? data.spartCoins ?? data.coins ?? 0));
            } else {
                const unsubUser = onSnapshot(doc(db, 'users', user.uid), (uSnap) => {
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        setLiveCoins(Number(uData.stats?.coins ?? uData.spartCoins ?? uData.coins ?? 0));
                    }
                });
                return () => unsubUser();
            }
        });
        return () => unsub();
    }, [user, userProfile]);

    const userCoins = liveCoins;

    const [isProcessingBuy, setIsProcessingBuy] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [confirmCheckout, setConfirmCheckout] = useState<'balance' | 'robokassa' | 'coins_only' | null>(null);

    // Sparta Coins Deduction in Cart (Calculated draft on the fly, physically charged only on order completion)
    const [coinsToSpend, setCoinsToSpend] = useState<number>(0);

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

    // Calculate subtotal after promo
    const afterPromoTotal = appliedPromo
        ? Math.floor(cartTotal * (1 - appliedPromo.value / 100))
        : cartTotal;

    // Max coins that can be applied to this cart total (respecting maxDiscountPercent and exchangeRate)
    const maxDiscountRub = Math.floor(afterPromoTotal * (maxDiscountPercent / 100));
    const maxCoinsByDiscount = Math.floor(maxDiscountRub / (exchangeRate || 10));
    const maxCoinsApplicable = Math.min(userCoins, maxCoinsByDiscount);
    const activeCoinsSpent = Math.max(0, Math.min(coinsToSpend, maxCoinsApplicable));
    const coinsDiscountRub = activeCoinsSpent * (exchangeRate || 10);

    const finalTotal = Math.max(0, afterPromoTotal - coinsDiscountRub);
    const isFullyCoveredByCoins = finalTotal === 0 && afterPromoTotal > 0;

    const handleCheckout = async (method: 'balance' | 'robokassa' | 'coins_only') => {
        if (!user) {
            showToast('Пожалуйста, войдите в систему', 'warning');
            return;
        }

        // Confirmation step
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
                childName: userData?.childName || userData?.childFirstName || '',
                phone: userData?.parentPhone || userData?.phone || '',
                groupId: userData?.groupId || null,
                groupName: userData?.groupName || null,
                items: orderItems,
                totalAmount: finalTotal,
                originalAmount: cartTotal,
                coinsSpent: activeCoinsSpent,
                coinsDiscountRub: coinsDiscountRub,
                paymentMethod: isFullyCoveredByCoins ? 'coins' : method,
                status: method === 'balance' || isFullyCoveredByCoins ? 'completed' : 'pending',
                type: 'shop_order',
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                discountApplied: appliedPromo ? `promo:${appliedPromo.code}` : 'none',
                estimatedArrival: null,
            };

            const orderRef = await addDoc(collection(db, 'orders'), orderData);
            const userRef = doc(db, 'users', user.uid);

            // Deduct Sparta Coins if used
            if (activeCoinsSpent > 0) {
                await updateDoc(userRef, {
                    coins: increment(-activeCoinsSpent)
                });
            }

            // Deduct balance if using internal balance
            if (method === 'balance' && finalTotal > 0) {
                const currentBalance = userData?.walletBalance ?? userData?.balance ?? 0;
                await updateDoc(userRef, {
                    walletBalance: currentBalance - finalTotal,
                });
            }

            // Create Notification
            let notifyMsg = `Ваш заказ #${orderRef.id.slice(-6).toUpperCase()} успешно оформлен!`;
            if (isFullyCoveredByCoins) {
                notifyMsg = `Заказ #${orderRef.id.slice(-6).toUpperCase()} на 100% оплачен бонусами (${activeCoinsSpent} 🟡). Выдача на тренировке.`;
            } else if (activeCoinsSpent > 0) {
                notifyMsg = `Заказ #${orderRef.id.slice(-6).toUpperCase()} оформлен: ${finalTotal} ₽ + списано ${activeCoinsSpent} 🟡.`;
            }

            await addDoc(collection(db, 'notifications'), {
                email: user.email,
                title: isFullyCoveredByCoins || method === 'balance' ? 'Заказ успешно оплачен! 🎉' : 'Заказ принят в обработку! 🛍️',
                message: notifyMsg,
                type: 'order',
                isRead: false,
                createdAt: serverTimestamp()
            });

            // Update Promo usage if used
            if (appliedPromo && appliedPromo.id) {
                const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                const currentUses = appliedPromo.currentUses || 0;
                const usersUsed = appliedPromo.usersUsed || [];
                await updateDoc(promoRef, {
                    currentUses: currentUses + 1,
                    usersUsed: [...usersUsed, user.uid]
                });

                await addDoc(collection(db, 'promo_activations'), {
                    userId: user.uid,
                    promoId: appliedPromo.id,
                    code: appliedPromo.code,
                    type: appliedPromo.type,
                    value: appliedPromo.value,
                    timestamp: serverTimestamp()
                });
            }

            showToast(isFullyCoveredByCoins ? 'Заказ оплачен бонусами! 🟡' : 'Заказ успешно оформлен! 🎉', 'success');
            clearCart();
            setIsCartOpen(false);

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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[140]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#111218] shadow-2xl z-[140] border-l border-white/10 flex flex-col font-manrope text-white"
                    >
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black font-russo uppercase text-white tracking-wider">
                                    Корзина
                                </h2>
                                <p className="text-zinc-400 text-xs sm:text-sm">
                                    {cartItems.length} {cartItems.length === 1 ? 'товар' : 'товаров'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white cursor-pointer"
                                aria-label="Закрыть"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                            {cartItems.length === 0 ? (
                                <div className="text-center py-20 text-zinc-500">
                                    <p className="text-base font-bold">Корзина пуста</p>
                                    <p className="text-xs mt-1">Добавьте экипировку из каталога</p>
                                </div>
                            ) : (
                                cartItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3.5 bg-black/40 border border-white/10 p-3 sm:p-3.5 rounded-2xl"
                                    >
                                        <img
                                            src={item.product.imageUrl || '/shop/sparta-uniform-green.png'}
                                            alt={item.product.title}
                                            className="w-16 h-16 sm:w-18 sm:h-18 object-cover rounded-xl border border-white/10 shrink-0"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                                {item.product.title}
                                            </h4>
                                            <div className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                                                {item.selectedSize && <span>Размер: <strong className="text-white font-medium">{item.selectedSize}</strong></span>}
                                                {(item.customName || item.customNumber) && (
                                                    <span> • Нанесение: <strong className="text-amber-300 font-semibold uppercase">{item.customName || ''} #{item.customNumber || ''}</strong></span>
                                                )}
                                                {item.selectedColor && <span className="text-zinc-500"> • {item.selectedColor}</span>}
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="font-mono text-amber-400 font-black text-xs sm:text-sm">
                                                    {formatRubles(item.product.price * item.quantity)}
                                                </div>

                                                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-5 text-center text-white text-xs font-bold font-mono">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                            aria-label="Удалить"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Checkout */}
                        {cartItems.length > 0 && (
                            <div className="p-5 sm:p-6 border-t border-white/10 bg-[#0d0e12] space-y-3.5">
                                {/* 1. Информационная плашка: Получение и срок изготовления */}
                                <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-xl space-y-1.5 text-xs">
                                    <div className="flex items-center gap-2 text-zinc-200">
                                        <span className="text-base leading-none">⚽</span>
                                        <span><strong>Получение заказа:</strong> Бесплатно на тренировке у тренера</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                                        <span className="text-base leading-none">⏱</span>
                                        <span><strong>Срок изготовления:</strong> 3–5 рабочих дней (пошив и индивидуальное нанесение)</span>
                                    </div>
                                </div>

                                {/* 2. Блок списания монет (точное числовое поле + кнопка "Все") */}
                                {userCoins > 0 && (
                                    <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-amber-500/25 space-y-3">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                                <SpartaCoinIcon size={16} animate={true} />
                                                <span>Списание монет</span>
                                            </div>
                                            <span className="text-[11px] text-zinc-400">
                                                Доступно: <strong className="text-amber-300 font-bold">{formatCoins(userCoins)} монет</strong> ({formatRubles(userCoins * (exchangeRate || 10))})
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxCoinsApplicable}
                                                    value={coinsToSpend === 0 ? '' : coinsToSpend}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            setCoinsToSpend(0);
                                                            return;
                                                        }
                                                        const num = parseInt(val, 10);
                                                        if (!isNaN(num)) {
                                                            setCoinsToSpend(Math.max(0, Math.min(maxCoinsApplicable, num)));
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none transition-all pr-24"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                                    <span className="text-xs text-amber-400 font-mono font-bold">🟡</span>
                                                    {activeCoinsSpent > 0 && (
                                                        <span className="text-xs text-emerald-400 font-mono font-bold">
                                                            =-{formatRubles(coinsDiscountRub)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setCoinsToSpend(maxCoinsApplicable)}
                                                className="px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                                            >
                                                Все ({maxCoinsApplicable})
                                            </button>
                                        </div>

                                        <div className="mt-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm">
                                            <span className="text-amber-400 text-xs">🛡️</span>
                                            <span className="text-[11px] font-medium tracking-wide text-amber-200/90">
                                                Монеты спишутся только после подтверждения заказа
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Promo Code Input */}
                                <div className="space-y-1.5">
                                    {appliedPromo ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                                <Check size={14} /> Промокод {appliedPromo.code} (-{appliedPromo.value}%)
                                            </div>
                                            <button onClick={() => setAppliedPromo(null)} className="text-zinc-400 hover:text-red-400 cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Промокод"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value)}
                                                className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 flex-1 text-white placeholder:text-white/30 outline-none focus:border-amber-400 uppercase font-mono text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={checkAndApplyPromo}
                                                disabled={isApplyingPromo || !promoCode.trim()}
                                                className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                {isApplyingPromo ? <Loader2 className="animate-spin" size={14} /> : "Применить"}
                                            </button>
                                        </div>
                                    )}
                                    {promoError && <p className="text-red-400 text-[10px] font-bold ml-1">{promoError}</p>}
                                </div>

                                {/* Summary Rows */}
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Товары ({cartItems.length})</span>
                                        <span className="font-mono">{formatRubles(cartTotal)}</span>
                                    </div>
                                    {appliedPromo && (
                                        <div className="flex justify-between text-emerald-400 font-bold">
                                            <span>Скидка промокода</span>
                                            <span className="font-mono">-{formatRubles(cartTotal - afterPromoTotal)}</span>
                                        </div>
                                    )}
                                    {activeCoinsSpent > 0 && (
                                        <div className="flex justify-between text-amber-300 font-bold">
                                            <span className="flex items-center gap-1">
                                                <SpartaCoinIcon size={12} animate={false} />
                                                Скидка за монеты ({activeCoinsSpent} 🟡)
                                            </span>
                                            <span className="font-mono text-emerald-400">-{formatRubles(coinsDiscountRub)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-white text-lg font-black pt-2 border-t border-white/10 mt-2">
                                        <span>Итого к оплате</span>
                                        <span className="font-mono text-amber-400">
                                            {isFullyCoveredByCoins ? '0 ₽' : formatRubles(finalTotal)}
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout Buttons */}
                                <div className="space-y-2.5 pt-1">
                                    {isFullyCoveredByCoins ? (
                                        <button
                                            type="button"
                                            disabled={isProcessingBuy}
                                            onClick={() => handleCheckout('coins_only')}
                                            className="w-full py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-101 active:scale-99 cursor-pointer uppercase text-xs tracking-wider"
                                        >
                                            {isProcessingBuy ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : confirmCheckout === 'coins_only' ? (
                                                'Подтвердить списание монет?'
                                            ) : (
                                                <>
                                                    <SpartaCoinIcon size={16} animate={false} />
                                                    Оплатить {activeCoinsSpent} 🟡 (0 ₽)
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isProcessingBuy}
                                                onClick={() => handleCheckout('balance')}
                                                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                                                    confirmCheckout === 'balance'
                                                        ? 'bg-amber-400 text-black border-amber-300 animate-pulse font-black'
                                                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <Wallet size={16} />
                                                {confirmCheckout === 'balance' ? 'Подтвердить списание баланса?' : 'С внутреннего баланса'}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isProcessingBuy}
                                                onClick={() => handleCheckout('robokassa')}
                                                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                                                    confirmCheckout === 'robokassa'
                                                        ? 'bg-amber-400 text-black animate-pulse'
                                                        : 'bg-white text-black hover:bg-zinc-200'
                                                }`}
                                            >
                                                {isProcessingBuy ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : confirmCheckout === 'robokassa' ? (
                                                    'Перейти к оплате картой?'
                                                ) : (
                                                    <>
                                                        <CreditCard size={16} />
                                                        Оплатить картой / СБП
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}

                                    {confirmCheckout && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmCheckout(null)}
                                            className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer pt-1"
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
