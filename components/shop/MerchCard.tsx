import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Sparkles, Flame, Zap, Check } from 'lucide-react';
import { Product } from '../../types/shop';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { rublesToCoins, formatCoins, formatRubles } from '../../utils/spartaCoins';
import SpartaCoinIcon from '../SpartaCoinIcon';

interface MerchCardProps {
    product: Product;
    userCoins?: number;
    onQuickView: (product: Product) => void;
    index?: number;
}

export const MerchCard: React.FC<MerchCardProps> = ({
    product,
    userCoins = 0,
    onQuickView,
    index = 0
}) => {
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, showToast } = useCart();

    const priceCoins = rublesToCoins(product.price);
    const canAffordCoins = userCoins >= priceCoins;

    const totalStock = product.isMadeToOrder
        ? 999
        : typeof product.stock === 'number'
        ? product.stock
        : typeof product.stock === 'object' && product.stock !== null
        ? Object.values(product.stock as unknown as Record<string, number>).reduce(
              (a: number, b: number) => a + (Number(b) || 0),
              0
          )
        : 999;

    const isOutOfStock = !product.isMadeToOrder && totalStock <= 0;
    const isLowStock = !product.isMadeToOrder && totalStock <= (product.lowStockThreshold || 3) && totalStock > 0;

    const getProductImage = (p: Product) => {
        if (p.imageUrl && !p.imageUrl.includes('undefined') && p.imageUrl.startsWith('http')) {
            return p.imageUrl;
        }
        const title = (p.title || '').toLowerCase();
        if (title.includes('lion') && (title.includes('зелен') || title.includes('green'))) return '/shop/sparta-puff-lion-green.png';
        if (title.includes('lion')) return '/shop/sparta-puff-lion-black.png';
        if (title.includes('classic') || title.includes('пуховик')) return '/shop/sparta-puff-black.png';
        if (title.includes('рюкзак')) return '/shop/sparta-backpack.png';
        if (title.includes('шапка') || title.includes('снуд')) return '/shop/sparta-hat-snood.png';
        if (title.includes('костюм') || title.includes('парадный')) return '/shop/sparta-tracksuit.png';
        if (title.includes('сер')) return '/shop/sparta-uniform-grey.png';
        if (title.includes('форм') || title.includes('зелен')) return '/shop/sparta-uniform-green.png';
        return p.imageUrl || '/shop/sparta-uniform-green.png';
    };

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOutOfStock) return;
        addToCart(product, 1, product.sizes?.[0] || 'Стандарт', product.colors?.[0] || 'Черный');
        showToast(`«${product.title}» добавлен в корзину!`, 'success');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.35 }}
            onClick={() => onQuickView(product)}
            className={`group bg-[#0d0e12] border border-white/10 hover:border-amber-500/40 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_10px_35px_-10px_rgba(245,158,11,0.2)] flex flex-col justify-between cursor-pointer relative ${
                isOutOfStock ? 'opacity-70 grayscale-[0.3]' : ''
            }`}
        >
            {/* Top Media Area */}
            <div className="relative aspect-[4/5] bg-gradient-to-b from-[#16181f] to-[#0d0e12] overflow-hidden">
                <img
                    src={getProductImage(product)}
                    alt={product.title}
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/shop/sparta-uniform-green.png';
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108 opacity-90 group-hover:opacity-100"
                />

                {/* Status Badges (Left) */}
                <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 flex flex-col gap-1.5 pointer-events-none">
                    {product.isMadeToOrder ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/95 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] font-black text-black shadow-lg uppercase tracking-wider">
                            <Sparkles size={11} className="text-black fill-black shrink-0" />
                            <span>Под заказ</span>
                        </span>
                    ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-600/95 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] font-black text-white shadow-lg uppercase tracking-wider animate-pulse">
                            <Flame size={11} className="text-white fill-white shrink-0" />
                            <span>Осталось {totalStock} шт</span>
                        </span>
                    ) : (
                        <>
                            {product.badges?.includes('hit') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-600/95 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] font-black text-white shadow-lg uppercase tracking-wider">
                                    <Flame size={11} className="text-white fill-white shrink-0" />
                                    <span>Хит</span>
                                </span>
                            )}
                            {product.badges?.includes('new') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-600/95 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] font-black text-white shadow-lg uppercase tracking-wider">
                                    <Sparkles size={11} className="text-white fill-white shrink-0" />
                                    <span>New</span>
                                </span>
                            )}
                            {product.badges?.includes('last_chance') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-orange-600/95 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] font-black text-white shadow-lg uppercase tracking-wider">
                                    <Zap size={11} className="text-white fill-white shrink-0" />
                                    <span>Финал</span>
                                </span>
                            )}
                        </>
                    )}

                    {/* Coins Affordability Pill */}
                    {canAffordCoins && userCoins > 0 && !isOutOfStock && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-black rounded-lg text-[9px] sm:text-[10px] font-black shadow-md uppercase tracking-wider animate-bounce-slow">
                            <SpartaCoinIcon size={11} animate={false} />
                            <span>Хватает монет!</span>
                        </span>
                    )}
                </div>

                {/* Favorite Button (Right) */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                    }}
                    className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-2 sm:p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all z-20 shadow-md border border-white/10 cursor-pointer"
                    aria-label="В избранное"
                >
                    <Heart
                        size={14}
                        fill={isFavorite(product.id) ? '#ef4444' : 'none'}
                        className={`sm:w-4 sm:h-4 ${isFavorite(product.id) ? 'text-red-500' : 'text-white'}`}
                    />
                </button>

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center z-10 p-2 text-center">
                        <span className="px-3 py-1 bg-red-600 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-full border border-red-500/50 shadow-lg">
                            Нет в наличии
                        </span>
                    </div>
                )}
            </div>

            {/* Product Info Section */}
            <div className="p-3 sm:p-4 md:p-4.5 flex flex-col flex-1 justify-between gap-3 text-left">
                <div>
                    {product.category && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1 truncate">
                            {product.category}
                        </span>
                    )}

                    <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-snug mb-1 group-hover:text-amber-300 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.4rem]">
                        {product.title}
                    </h3>

                    {/* Customization label */}
                    {!!product.isCustomizable && (
                        <div className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md mt-0.5">
                            <Sparkles size={10} className="text-amber-400 shrink-0" />
                            <span className="truncate">Именная печать</span>
                        </div>
                    )}
                </div>

                {/* Dual Price Row & Action */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                        {/* Primary Ruble Price */}
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs sm:text-sm md:text-base font-black text-white tracking-tight leading-none truncate">
                                {formatRubles(product.price)}
                            </span>
                            {product.oldPrice && product.oldPrice > product.price && (
                                <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded">
                                    -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                </span>
                            )}
                        </div>

                        {/* Sparta Coin Alternative Price Tag */}
                        <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-bold text-amber-400">
                            <span>или</span>
                            <span className="inline-flex items-center gap-0.5 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.2 rounded font-black text-amber-300">
                                <SpartaCoinIcon size={11} animate={false} />
                                {formatCoins(priceCoins)}
                            </span>
                        </div>
                    </div>

                    {/* Quick Add To Cart Button */}
                    <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={handleQuickAdd}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Добавить в корзину"
                        aria-label="В корзину"
                    >
                        <ShoppingBag size={15} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default MerchCard;
