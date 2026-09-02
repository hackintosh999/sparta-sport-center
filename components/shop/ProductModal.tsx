import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    Check,
    CreditCard,
    Sparkles,
    ShieldCheck,
    Heart,
    Sliders,
    Zap,
    Tag,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { Product } from '../../types/shop';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';
import { BaseModal } from '../ui/BaseModal';
import SpartaCoinIcon from '../SpartaCoinIcon';
import {
    rublesToCoins,
    coinsToRubles,
    formatCoins,
    formatRubles,
    calculateSplitPayment,
    SPARTA_COIN_RATE
} from '../../utils/spartaCoins';

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    userCoins?: number;
}

type PaymentMethodType = 'rubles' | 'coins' | 'split';

export const ProductModal: React.FC<ProductModalProps> = ({
    product,
    isOpen,
    onClose,
    userCoins: propsUserCoins
}) => {
    const { user, userProfile } = useAuth();
    const { addToCart, setIsCartOpen, showToast } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();

    const userCoins = typeof propsUserCoins === 'number'
        ? propsUserCoins
        : (userProfile?.coins ?? 150);

    const [selectedSize, setSelectedSize] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [customName, setCustomName] = useState<string>('');
    const [customNumber, setCustomNumber] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('rubles');
    const [coinsToSpend, setCoinsToSpend] = useState<number>(0);
    const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

    // Initialize defaults on open
    useEffect(() => {
        if (product) {
            setSelectedSize(product.sizes?.[0] || 'Стандарт');
            setSelectedColor(product.colors?.[0] || 'Черный');
            setCustomName('');
            setCustomNumber('');
            setQuantity(1);
            setSelectedGalleryImage(null);

            const priceCoins = rublesToCoins(product.price);
            if (userCoins >= priceCoins) {
                // If user has enough coins, default to split or coins
                setPaymentMethod('coins');
                setCoinsToSpend(priceCoins);
            } else if (userCoins > 0) {
                setPaymentMethod('split');
                setCoinsToSpend(Math.min(userCoins, priceCoins));
            } else {
                setPaymentMethod('rubles');
                setCoinsToSpend(0);
            }
        }
    }, [product, userCoins]);

    if (!product) return null;

    const basePrice = product.price * quantity;
    const splitCalc = calculateSplitPayment(basePrice, userCoins, coinsToSpend);

    const priceCoins = rublesToCoins(basePrice);
    const canAffordCoinsFully = userCoins >= priceCoins;

    const getProductImage = () => {
        if (selectedGalleryImage) return selectedGalleryImage;
        if (product.imageUrl && !product.imageUrl.includes('undefined') && product.imageUrl.startsWith('http')) {
            return product.imageUrl;
        }
        const title = (product.title || '').toLowerCase();
        if (title.includes('lion') && (title.includes('зелен') || title.includes('green'))) return '/shop/sparta-puff-lion-green.png';
        if (title.includes('lion')) return '/shop/sparta-puff-lion-black.png';
        if (title.includes('classic') || title.includes('пуховик')) return '/shop/sparta-puff-black.png';
        if (title.includes('рюкзак')) return '/shop/sparta-backpack.png';
        if (title.includes('шапка') || title.includes('снуд')) return '/shop/sparta-hat-snood.png';
        if (title.includes('костюм') || title.includes('парадный')) return '/shop/sparta-tracksuit.png';
        if (title.includes('сер')) return '/shop/sparta-uniform-grey.png';
        if (title.includes('форм') || title.includes('зелен')) return '/shop/sparta-uniform-green.png';
        return product.imageUrl || '/shop/sparta-uniform-green.png';
    };

    const handleAddToCart = () => {
        addToCart(
            product,
            quantity,
            selectedSize,
            selectedColor,
            customName.trim() || undefined,
            customNumber.trim() || undefined
        );

        let note = `«${product.title}» добавлен в корзину!`;
        if (paymentMethod === 'coins') {
            note = `«${product.title}» добавлен (оплата 🟡 ${formatCoins(priceCoins)})`;
        } else if (paymentMethod === 'split' && splitCalc.coinsToSpend > 0) {
            note = `«${product.title}» со скидкой ${splitCalc.coinDiscountRub} ₽ за ${splitCalc.coinsToSpend} 🟡`;
        }

        showToast(note, 'success');
        onClose();
        setIsCartOpen(true);
    };

    const setSplitPreset = (percent: number) => {
        const targetDiscountRub = Math.floor(basePrice * (percent / 100));
        const neededCoins = Math.ceil(targetDiscountRub / SPARTA_COIN_RATE);
        const actualCoins = Math.min(userCoins, neededCoins);
        setCoinsToSpend(actualCoins);
        setPaymentMethod('split');
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-3xl"
            glowColor="amber"
            zIndex="z-[150]"
        >
            <div className="text-left font-manrope text-white space-y-6">
                {/* Main Product Grid: Gallery + Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {/* Left: Product Images */}
                    <div className="space-y-3">
                        <div className="relative aspect-[4/5] bg-gradient-to-b from-[#181a22] to-[#0d0e12] rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                            <img
                                src={getProductImage()}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />

                            {/* Favorite Button */}
                            <button
                                type="button"
                                onClick={() => toggleFavorite(product.id)}
                                className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all z-20 border border-white/10 cursor-pointer"
                                aria-label="В избранное"
                            >
                                <Heart
                                    size={16}
                                    fill={isFavorite(product.id) ? '#ef4444' : 'none'}
                                    className={isFavorite(product.id) ? 'text-red-500' : 'text-white'}
                                />
                            </button>

                            {/* Custom Badge */}
                            {product.isMadeToOrder && (
                                <span className="absolute top-3 left-3 px-2.5 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1">
                                    <Sparkles size={11} /> Индивидуальный пошив
                                </span>
                            )}
                        </div>

                        {/* Additional Thumbnails if gallery exists */}
                        {product.gallery && product.gallery.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                <button
                                    onClick={() => setSelectedGalleryImage(null)}
                                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                                        selectedGalleryImage === null ? 'border-amber-400 scale-105' : 'border-transparent opacity-60'
                                    }`}
                                >
                                    <img src={getProductImage()} alt="" className="w-full h-full object-cover" />
                                </button>
                                {product.gallery.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedGalleryImage(img)}
                                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                                            selectedGalleryImage === img ? 'border-amber-400 scale-105' : 'border-transparent opacity-60'
                                        }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Details & Options */}
                    <div className="flex flex-col justify-between space-y-4">
                        <div>
                            {product.category && (
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                                    {product.category}
                                </span>
                            )}
                            <h2 className="text-xl sm:text-2xl font-black font-russo text-white leading-tight">
                                {product.title}
                            </h2>

                            {/* Price Presentation */}
                            <div className="mt-3 flex items-center gap-3">
                                <span className="font-mono text-2xl font-black text-white">
                                    {formatRubles(basePrice)}
                                </span>
                                <span className="text-xs text-zinc-400 font-bold">или</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-black text-sm">
                                    <SpartaCoinIcon size={14} animate={false} />
                                    {formatCoins(priceCoins)} монет
                                </span>
                            </div>

                            {/* Short Description */}
                            {product.description && (
                                <p className="text-xs text-zinc-300 mt-3 leading-relaxed line-clamp-3">
                                    {product.description}
                                </p>
                            )}

                            {/* Size Selection */}
                            {product.sizes && product.sizes.length > 0 && (
                                <div className="mt-4">
                                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                                        Выберите размер / рост
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {product.sizes.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setSelectedSize(s)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                                    selectedSize === s
                                                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                                                        : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/25 hover:text-white'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Color Selection */}
                            {product.colors && product.colors.length > 0 && (
                                <div className="mt-4">
                                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                                        Цвет
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {product.colors.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setSelectedColor(c)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                    selectedColor === c
                                                        ? 'bg-white text-black border-white shadow-md font-black scale-105'
                                                        : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/25 hover:text-white'
                                                }`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Personalization (If available) */}
                            {product.isCustomizable && (
                                <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                        <Sparkles size={14} />
                                        <span>Персонализация формы (бесплатно)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="Фамилия на спине"
                                            className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={customNumber}
                                            onChange={(e) => setCustomNumber(e.target.value)}
                                            placeholder="Игровой номер"
                                            className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-xs font-bold text-zinc-400 uppercase">Количество:</span>
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="text-zinc-400 hover:text-white text-base font-bold cursor-pointer"
                                >
                                    -
                                </button>
                                <span className="font-mono font-bold text-sm text-white">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="text-zinc-400 hover:text-white text-base font-bold cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- HYBRID PAYMENT SELECTOR (Stage 2 & 3 Core Requirement) --- */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#14161f] border border-amber-500/25 space-y-4 shadow-lg">
                    {/* User Balance Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                                Система клубной валюты
                            </span>
                            <h4 className="font-russo text-sm sm:text-base text-white flex items-center gap-1.5">
                                <span>Выберите способ оплаты</span>
                            </h4>
                        </div>

                        {/* Balance Badge */}
                        <div className="inline-flex items-center gap-1.5 bg-black/40 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                            <span className="text-zinc-400">Ваш баланс:</span>
                            <span className="text-amber-300 font-black flex items-center gap-1">
                                <SpartaCoinIcon size={14} animate={false} />
                                {formatCoins(userCoins)} 🟡
                            </span>
                            <span className="text-zinc-500 text-[10px]">
                                (≈ {formatRubles(coinsToRubles(userCoins))})
                            </span>
                        </div>
                    </div>

                    {/* 3 Payment Mode Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Mode 1: 100% Rubles */}
                        <button
                            type="button"
                            onClick={() => {
                                setPaymentMethod('rubles');
                                setCoinsToSpend(0);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                                paymentMethod === 'rubles'
                                    ? 'bg-amber-400/10 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <CreditCard size={16} className={paymentMethod === 'rubles' ? 'text-amber-400' : 'text-zinc-500'} />
                                {paymentMethod === 'rubles' && <Check size={14} className="text-amber-400" />}
                            </div>
                            <div className="text-xs font-black uppercase text-white">Только рубли</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">{formatRubles(basePrice)}</div>
                        </button>

                        {/* Mode 2: 100% Coins */}
                        <button
                            type="button"
                            disabled={!canAffordCoinsFully}
                            onClick={() => {
                                setPaymentMethod('coins');
                                setCoinsToSpend(priceCoins);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                                !canAffordCoinsFully
                                    ? 'opacity-40 cursor-not-allowed bg-black/20 border-white/5 text-zinc-500'
                                    : paymentMethod === 'coins'
                                    ? 'bg-amber-400/15 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer'
                                    : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <SpartaCoinIcon size={16} animate={paymentMethod === 'coins'} />
                                {paymentMethod === 'coins' && <Check size={14} className="text-amber-400" />}
                            </div>
                            <div className="text-xs font-black uppercase text-white">100% Монетами</div>
                            <div className="text-[11px] text-amber-300 mt-0.5 font-bold">
                                {formatCoins(priceCoins)} 🟡 (0 ₽)
                            </div>
                            {!canAffordCoinsFully && (
                                <div className="text-[9px] text-red-400 mt-1">
                                    Не хватает {formatCoins(priceCoins - userCoins)} 🟡
                                </div>
                            )}
                        </button>

                        {/* Mode 3: Split (Coins + Rubles) */}
                        <button
                            type="button"
                            disabled={userCoins <= 0}
                            onClick={() => {
                                setPaymentMethod('split');
                                if (coinsToSpend <= 0) {
                                    setCoinsToSpend(Math.min(userCoins, Math.floor(priceCoins / 2)));
                                }
                            }}
                            className={`p-3 rounded-xl border text-left transition-all relative ${
                                userCoins <= 0
                                    ? 'opacity-40 cursor-not-allowed bg-black/20 border-white/5 text-zinc-500'
                                    : paymentMethod === 'split'
                                    ? 'bg-amber-400/10 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer'
                                    : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20 hover:text-white cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <Zap size={16} className={paymentMethod === 'split' ? 'text-amber-400' : 'text-zinc-500'} />
                                {paymentMethod === 'split' && <Check size={14} className="text-amber-400" />}
                            </div>
                            <div className="text-xs font-black uppercase text-white">Сплит (Монеты + ₽)</div>
                            <div className="text-[11px] text-amber-400 mt-0.5">Скидка до 100%</div>
                        </button>
                    </div>

                    {/* Split Slider / Controls (Active only in Split mode) */}
                    <AnimatePresence>
                        {paymentMethod === 'split' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-3 border-t border-white/10"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-zinc-300">Списать спартакоинов:</span>
                                    <span className="font-black text-amber-300 flex items-center gap-1 font-mono">
                                        <SpartaCoinIcon size={14} animate={false} />
                                        {formatCoins(coinsToSpend)} 🟡 = Скидка -{formatRubles(splitCalc.coinDiscountRub)}
                                    </span>
                                </div>

                                {/* Slider */}
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.min(userCoins, priceCoins)}
                                    value={coinsToSpend}
                                    onChange={(e) => setCoinsToSpend(Number(e.target.value))}
                                    className="w-full accent-amber-400 cursor-pointer h-2 bg-black/50 rounded-lg"
                                />

                                {/* Quick Presets */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Быстро:</span>
                                    {[
                                        { label: '25%', val: 25 },
                                        { label: '50%', val: 50 },
                                        { label: '75%', val: 75 },
                                        { label: 'Максимум', val: 100 }
                                    ].map((p) => (
                                        <button
                                            key={p.val}
                                            type="button"
                                            onClick={() => setSplitPreset(p.val)}
                                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Final Payment Summary Bar */}
                    <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                                Итого к оплате:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                                    {paymentMethod === 'coins' ? '0 ₽' : formatRubles(splitCalc.finalRublesToPay)}
                                </span>
                                {paymentMethod !== 'rubles' && splitCalc.coinsToSpend > 0 && (
                                    <span className="text-xs font-bold text-zinc-400">
                                        + {formatCoins(paymentMethod === 'coins' ? priceCoins : splitCalc.coinsToSpend)} 🟡
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Add to Cart CTA */}
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-102 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <ShoppingBag size={16} />
                            <span>В корзину</span>
                        </button>
                    </div>
                </div>

                {/* Guarantee & Club Delivery Note */}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Выдача и примерка на тренировке у тренера группы Sparta</span>
                </div>
            </div>
        </BaseModal>
    );
};

export default ProductModal;
