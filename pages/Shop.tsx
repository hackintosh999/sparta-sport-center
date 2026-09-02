import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    Search,
    Loader2,
    ArrowLeft,
    Filter,
    ChevronDown,
    Check,
    Heart,
    ShoppingCart,
    Truck,
    RefreshCw,
    Sparkles,
    X,
    RotateCcw,
    Flame,
    Zap,
    SlidersHorizontal
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from '../types/shop';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import SpartaCoinIcon from '../components/SpartaCoinIcon';
import { rublesToCoins, formatCoins } from '../utils/spartaCoins';

const Shop = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, setIsCartOpen, cartCount } = useCart();

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedColor, setSelectedColor] = useState('All');
    const [selectedSize, setSelectedSize] = useState('All');
    const [minPrice, setMinPrice] = useState<number | string>('');
    const [maxPrice, setMaxPrice] = useState<number | string>('');
    const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc' | 'discount'>('default');

    // Mobile / Tablet Bottom Sheet filter state
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'products'),
            (snapshot) => {
                const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(list);
                setLoading(false);
            },
            (err) => {
                console.error('Error listening to products:', err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const getProductImage = (product: Product) => {
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

    const categories = useMemo(() => {
        return ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
    }, [products]);

    const allColors = useMemo(() => {
        return Array.from(new Set(products.flatMap((p) => p.colors || []).filter(Boolean)));
    }, [products]);

    const colors = useMemo(() => ['All', ...allColors], [allColors]);

    const allSizes = useMemo(() => {
        return Array.from(new Set(products.flatMap((p) => p.sizes || []).filter(Boolean))).sort();
    }, [products]);

    const sizes = useMemo(() => ['All', ...allSizes], [allSizes]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedCategory !== 'All') count++;
        if (selectedSize !== 'All') count++;
        if (selectedColor !== 'All') count++;
        if (minPrice !== '' || maxPrice !== '') count++;
        if (sortOrder !== 'default') count++;
        return count;
    }, [selectedCategory, selectedSize, selectedColor, minPrice, maxPrice, sortOrder]);

    const hasActiveFilters = activeFiltersCount > 0 || searchTerm !== '';

    const resetFilters = () => {
        setSelectedCategory('All');
        setSelectedSize('All');
        setSelectedColor('All');
        setMinPrice('');
        setMaxPrice('');
        setSearchTerm('');
        setSortOrder('default');
    };

    // Filter and Sort Logic
    const filteredProducts = useMemo(() => {
        return products
            .filter((p) => {
                if (p.isHidden) return false;

                const matchesSearch =
                    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

                const matchesCategory =
                    selectedCategory === 'All' ||
                    (selectedCategory === 'Favorites' ? isFavorite(p.id) : p.category === selectedCategory);

                const matchesColor = selectedColor === 'All' || (p.colors && p.colors.includes(selectedColor));
                const matchesSize = selectedSize === 'All' || (p.sizes && p.sizes.includes(selectedSize));

                const numMin = minPrice !== '' ? Number(minPrice) : 0;
                const numMax = maxPrice !== '' ? Number(maxPrice) : Infinity;
                const matchesPrice = (p.price || 0) >= numMin && (p.price || 0) <= numMax;

                return matchesSearch && matchesCategory && matchesColor && matchesSize && matchesPrice;
            })
            .sort((a, b) => {
                if (sortOrder === 'asc') return a.price - b.price;
                if (sortOrder === 'desc') return b.price - a.price;
                if (sortOrder === 'discount') {
                    const aDisc = a.oldPrice && a.oldPrice > a.price ? a.oldPrice - a.price : 0;
                    const bDisc = b.oldPrice && b.oldPrice > b.price ? b.oldPrice - b.price : 0;
                    return bDisc - aDisc;
                }
                // 'default' (hits & new items first)
                const aScore = (a.badges?.includes('hit') ? 2 : 0) + (a.badges?.includes('new') ? 1 : 0);
                const bScore = (b.badges?.includes('hit') ? 2 : 0) + (b.badges?.includes('new') ? 1 : 0);
                return bScore - aScore;
            });
    }, [products, searchTerm, selectedCategory, selectedColor, selectedSize, minPrice, maxPrice, sortOrder, isFavorite]);

    const getCategoryEmoji = (cat: string) => {
        const c = cat.toLowerCase();
        if (c.includes('форм') || c.includes('игровая')) return '👕';
        if (c.includes('пуховик') || c.includes('куртк')) return '🧥';
        if (c.includes('костюм') || c.includes('парадный')) return '🥋';
        if (c.includes('рюкзак') || c.includes('сумк')) return '🎒';
        if (c.includes('шапк') || c.includes('снуд') || c.includes('головн')) return '🧢';
        if (c.includes('аксессуар') || c.includes('атрибут')) return '🧣';
        if (c.includes('обув') || c.includes('бутс')) return '👟';
        return '⚡';
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white font-manrope selection:bg-yellow-500 selection:text-black">
            <SEO
                title="Магазин экипировки Sparta"
                description="Официальный магазин спортивной экипировки SPARTA. Форма, одежда, аксессуары и оборудование высшего качества."
                keywords="магазин спарта, футбольная форма, спортивная экипировка, купить футбольную форму"
            />

            {/* --- FLOATING CART BUTTON (RESPONSIVE FAB) --- */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 bg-gradient-to-r from-yellow-500 to-amber-400 text-black p-3.5 sm:p-4 rounded-2xl shadow-[0_0_35px_rgba(234,179,8,0.35)] flex items-center justify-center cursor-pointer border border-yellow-300/40 backdrop-blur-md"
                aria-label="Открыть корзину"
            >
                <ShoppingCart size={22} className="sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-black border-2 border-[#070707] animate-pulse">
                        {cartCount}
                    </span>
                )}
            </motion.button>

            {/* --- COMPACT SLEEK HEADER --- */}
            <div className="relative overflow-hidden bg-[#0d0d0d] border-b border-white/5 pt-16 pb-4 sm:pt-20 sm:pb-6 px-3.5 sm:px-6">
                <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors group bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 cursor-pointer"
                        >
                            <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform" />
                            <span>На главную</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                <ShoppingBag className="text-yellow-500 shrink-0" size={22} />
                                <span>
                                    Экипировка <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Sparta</span>
                                </span>
                            </h1>
                            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                                Официальная клубная форма и аксессуары с выдачей на тренировке
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN STOREFRONT CONTAINER --- */}
            <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 md:py-8 relative z-20">

                {/* --- MOBILE & TABLET SEARCH & QUICK CATEGORIES CAROUSEL --- */}
                <div className="mb-4 sm:mb-6 space-y-3">
                    {/* Search Bar + Filter Trigger */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors"
                                size={17}
                            />
                            <input
                                type="text"
                                placeholder="Поиск по названию или категории..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#121212] border border-white/5 rounded-2xl py-2.5 sm:py-3 pl-10 pr-9 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:bg-[#161616] transition-all text-xs sm:text-sm shadow-inner"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Mobile/Tablet Filter Sheet Trigger Button */}
                        <button
                            type="button"
                            onClick={() => setIsMobileFilterOpen(true)}
                            className={`lg:hidden relative flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                                activeFiltersCount > 0
                                    ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.25)] font-extrabold'
                                    : 'bg-[#121212] text-gray-300 border-white/10 hover:border-yellow-500/30'
                            }`}
                        >
                            <SlidersHorizontal size={15} />
                            <span className="hidden min-[420px]:inline">Фильтры</span>
                            {activeFiltersCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-black text-yellow-400 text-[10px] font-black flex items-center justify-center ml-0.5">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Horizontal Swipeable Category Chips Bar */}
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none custom-scrollbar">
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                                        isSelected
                                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 font-black scale-[1.02]'
                                            : 'bg-[#121212] text-gray-300 hover:text-white border border-white/5 hover:border-white/15'
                                    }`}
                                >
                                    <span>{getCategoryEmoji(cat)}</span>
                                    <span>{cat === 'All' ? 'Все товары' : cat}</span>
                                </button>
                            );
                        })}

                        {/* Favorites Chip */}
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('Favorites')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                                selectedCategory === 'Favorites'
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 font-black scale-[1.02]'
                                    : 'bg-[#121212] text-gray-300 hover:text-red-400 border border-white/5 hover:border-red-500/20'
                            }`}
                        >
                            <Heart size={13} fill={selectedCategory === 'Favorites' ? 'currentColor' : 'none'} className="text-red-500" />
                            <span>Избранное</span>
                        </button>
                    </div>
                </div>

                {/* --- MAIN CONTENT LAYOUT (SIDEBAR + GRID) --- */}
                <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">
                    {/* --- DESKTOP FILTERS SIDEBAR (>= 1024px) --- */}
                    <aside className="hidden lg:block w-64 flex-shrink-0 space-y-6 bg-[#0e0e0e] border border-white/5 p-5 rounded-3xl h-fit sticky top-24">
                        {/* Sort Order */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                <span>Сортировка</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { id: 'default', label: '⭐ Хиты' },
                                    { id: 'discount', label: '🏷️ Скидки' },
                                    { id: 'asc', label: '↓ Дешевле' },
                                    { id: 'desc', label: '↑ Дороже' }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSortOrder(s.id as any)}
                                        className={`py-2 px-2 text-xs font-bold rounded-xl transition-all border text-center cursor-pointer ${
                                            sortOrder === s.id
                                                ? 'bg-yellow-500 text-black border-yellow-400 font-extrabold shadow-md'
                                                : 'bg-[#141414] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Categories List */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                Категории
                            </h3>
                            <div className="space-y-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex justify-between items-center cursor-pointer ${
                                            selectedCategory === cat
                                                ? 'bg-yellow-500 text-black font-bold shadow-md'
                                                : 'bg-[#141414] text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span>{getCategoryEmoji(cat)}</span>
                                            <span>{cat === 'All' ? 'Все товары' : cat}</span>
                                        </span>
                                        {selectedCategory === cat && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sizes */}
                        {sizes.length > 1 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                    Размер / Рост
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {sizes.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => setSelectedSize(size)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                selectedSize === size
                                                    ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                                                    : 'bg-[#141414] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            {size === 'All' ? 'Все' : size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Price Range */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                Цена, ₽
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 font-medium">от</span>
                                    <input
                                        type="number"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                                        className="w-full bg-[#141414] border border-white/5 rounded-xl py-2 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-yellow-500/50"
                                        placeholder="0"
                                    />
                                </div>
                                <span className="text-gray-500 text-xs">—</span>
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 font-medium">до</span>
                                    <input
                                        type="number"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                                        className="w-full bg-[#141414] border border-white/5 rounded-xl py-2 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-yellow-500/50"
                                        placeholder="10000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        {colors.length > 1 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                    Цвета
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {colors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                selectedColor === color
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-[#141414] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            {color === 'All' ? 'Все цвета' : color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Delivery Trust Badge */}
                        <div className="bg-[#141414] p-3.5 rounded-2xl border border-white/5 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                                <Truck size={15} className="text-yellow-500 shrink-0" />
                                <span>Выдача на тренировке</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                                <RefreshCw size={15} className="text-emerald-400 shrink-0" />
                                <span>Бесплатный обмен размера</span>
                            </div>
                        </div>
                    </aside>

                    {/* --- PRODUCTS GRID SECTION --- */}
                    <div className="flex-1 min-w-0">
                        {/* Promo Bundle Banner (Responsive) */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-[#141414] via-[#1c1a12] to-[#141414] border border-yellow-500/20 rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 sm:w-80 h-full bg-yellow-500/10 blur-3xl pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                                <div className="space-y-1 max-w-xl">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                        <Sparkles size={12} className="text-yellow-400 animate-pulse" />
                                        <span>Клубный Комплект Sparta</span>
                                    </div>
                                    <h2 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight">
                                        Набор юного спартанца <span className="text-yellow-500">-15%</span>
                                    </h2>
                                    <p className="text-[11px] sm:text-xs md:text-sm text-gray-400 leading-relaxed">
                                        Соберите комплект (Форма + Рюкзак + Шапка) со скидкой по промокоду{' '}
                                        <span className="font-mono text-yellow-400 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                            SPARTAKIT
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCategory('Форма')}
                                    className="px-4 py-2 sm:px-5 sm:py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                    Выбрать форму
                                </button>
                            </div>
                        </div>

                        {/* Active Filters Bar & Count */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 sm:mb-6 bg-[#0f0f0f] p-3 sm:p-3.5 px-4 rounded-2xl border border-white/5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                <span className="text-white font-bold text-xs sm:text-sm">{filteredProducts.length}</span>
                                <span>
                                    {filteredProducts.length % 10 === 1 && filteredProducts.length % 100 !== 11
                                        ? 'товар'
                                        : [2, 3, 4].includes(filteredProducts.length % 10) && ![12, 13, 14].includes(filteredProducts.length % 100)
                                        ? 'товара'
                                        : 'товаров'}
                                </span>

                                {hasActiveFilters && (
                                    <>
                                        <span className="text-gray-600 hidden sm:inline">•</span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {selectedCategory !== 'All' && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    {selectedCategory === 'Favorites' ? 'Избранное' : selectedCategory}
                                                    <button onClick={() => setSelectedCategory('All')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                            {selectedSize !== 'All' && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    Размер: {selectedSize}
                                                    <button onClick={() => setSelectedSize('All')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                            {selectedColor !== 'All' && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    {selectedColor}
                                                    <button onClick={() => setSelectedColor('All')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                            {minPrice !== '' && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    от {Number(minPrice).toLocaleString()} ₽
                                                    <button onClick={() => setMinPrice('')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                            {maxPrice !== '' && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    до {Number(maxPrice).toLocaleString()} ₽
                                                    <button onClick={() => setMaxPrice('')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                            {searchTerm && (
                                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white text-[10px] sm:text-[11px] px-2 py-0.5 rounded-lg">
                                                    «{searchTerm}»
                                                    <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-white cursor-pointer ml-0.5">
                                                        <X size={11} />
                                                    </button>
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="text-xs text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    <span>Сбросить</span>
                                </button>
                            )}
                        </div>

                        {/* --- ADAPTIVE FLUID PRODUCTS GRID --- */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-28 opacity-50">
                                <Loader2 className="animate-spin text-yellow-500 mb-3" size={40} />
                                <p className="text-xs uppercase tracking-widest font-bold text-gray-400">Загрузка каталога...</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
                                <AnimatePresence>
                                    {filteredProducts.map((product, index) => {
                                        const totalStock =
                                            product.isMadeToOrder
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

                                        // Badge priority
                                        let singleBadge = null;
                                        if (product.isMadeToOrder) {
                                            singleBadge = (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/90 backdrop-blur-md rounded-lg text-[9px] sm:text-[11px] font-black text-black shadow-lg uppercase tracking-wider">
                                                    <Sparkles size={11} className="text-black fill-black shrink-0" />
                                                    <span>Под заказ</span>
                                                </span>
                                            );
                                        } else if (isLowStock) {
                                            singleBadge = (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-600/90 backdrop-blur-md rounded-lg text-[9px] sm:text-[11px] font-black text-white shadow-lg uppercase tracking-wider animate-pulse">
                                                    <Flame size={11} className="text-white fill-white shrink-0" />
                                                    <span>Осталось: {totalStock} шт</span>
                                                </span>
                                            );
                                        } else if (!isOutOfStock) {
                                            if (product.badges?.includes('hit')) {
                                                singleBadge = (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-600/90 backdrop-blur-md rounded-lg text-[9px] sm:text-[11px] font-black text-white shadow-lg uppercase tracking-wider">
                                                        <Flame size={11} className="text-white fill-white shrink-0" />
                                                        <span>Хит</span>
                                                    </span>
                                                );
                                            } else if (product.badges?.includes('new')) {
                                                singleBadge = (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-green-600/90 backdrop-blur-md rounded-lg text-[9px] sm:text-[11px] font-black text-white shadow-lg uppercase tracking-wider">
                                                        <Sparkles size={11} className="text-white fill-white shrink-0" />
                                                        <span>New</span>
                                                    </span>
                                                );
                                            } else if (product.badges?.includes('last_chance')) {
                                                singleBadge = (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-orange-600/90 backdrop-blur-md rounded-lg text-[9px] sm:text-[11px] font-black text-white shadow-lg uppercase tracking-wider">
                                                        <Zap size={11} className="text-white fill-white shrink-0" />
                                                        <span>Финал</span>
                                                    </span>
                                                );
                                            }
                                        }

                                        return (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.35 }}
                                                className={`group bg-[#0d0d0d] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-yellow-500/30 transition-all hover:bg-[#121212] shadow-xl flex flex-col ${
                                                    isOutOfStock ? 'opacity-70 grayscale-[0.4]' : ''
                                                }`}
                                            >
                                                {/* Image Container */}
                                                <div
                                                    className="relative aspect-[4/5] bg-gradient-to-b from-[#181818] to-[#0d0d0d] overflow-hidden cursor-pointer"
                                                    onClick={() => navigate(`/shop/${product.id}`)}
                                                >
                                                    <img
                                                        src={getProductImage(product)}
                                                        alt={product.title}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/shop/sparta-uniform-green.png';
                                                        }}
                                                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108 opacity-90 group-hover:opacity-100"
                                                    />

                                                    {isOutOfStock && (
                                                        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center z-10 p-2 text-center">
                                                            <span className="px-3 py-1 bg-red-600 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-full border border-red-500/50 shadow-lg">
                                                                Нет в наличии
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Favorite Heart Icon */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFavorite(product.id);
                                                        }}
                                                        className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-2 sm:p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:scale-110 active:scale-95 transition-all z-20 shadow-md border border-white/10 cursor-pointer"
                                                        aria-label="В избранное"
                                                    >
                                                        <Heart
                                                            size={14}
                                                            fill={isFavorite(product.id) ? '#ef4444' : 'none'}
                                                            className={`sm:w-4 sm:h-4 ${isFavorite(product.id) ? 'text-red-500' : 'text-white'}`}
                                                        />
                                                    </button>

                                                    {/* Badge Overlay */}
                                                    {singleBadge && (
                                                        <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 pointer-events-none">
                                                            {singleBadge}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content Details */}
                                                <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-1 relative justify-between">
                                                    <div>
                                                        {product.category && (
                                                            <span className="text-[9px] sm:text-[10px] font-bold text-yellow-500 uppercase tracking-wider block mb-1 truncate">
                                                                {product.category}
                                                            </span>
                                                        )}

                                                        <h3
                                                            onClick={() => navigate(`/shop/${product.id}`)}
                                                            className="text-xs sm:text-sm md:text-base font-bold text-white leading-snug mb-1.5 group-hover:text-yellow-400 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] cursor-pointer"
                                                        >
                                                            {product.title}
                                                        </h3>

                                                        {/* Customization Badge */}
                                                        {!!product.isCustomizable && (
                                                            <div className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-md mb-2">
                                                                <Sparkles size={10} className="text-yellow-400 shrink-0" />
                                                                <span className="truncate">Печать номера</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Price & Add to Cart Action Row */}
                                                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                                        {product.oldPrice && product.oldPrice > product.price ? (
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-mono text-xs sm:text-sm md:text-base font-black text-red-500 tracking-tight leading-none truncate">
                                                                        {product.price.toLocaleString()} ₽
                                                                    </span>
                                                                    <span className="px-1 py-0.2 bg-red-500/20 text-red-400 text-[9px] font-bold rounded">
                                                                        -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mt-1">
                                                                    <SpartaCoinIcon size={11} animate={false} />
                                                                    <span>{formatCoins(rublesToCoins(product.price))} SpartCoins</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="font-mono text-xs sm:text-sm md:text-base font-bold text-yellow-400 tracking-tight truncate">
                                                                    {product.price.toLocaleString()} ₽
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mt-1">
                                                                    <SpartaCoinIcon size={11} animate={false} />
                                                                    <span>{formatCoins(rublesToCoins(product.price))} SpartCoins</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <button
                                                            disabled={isOutOfStock}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isOutOfStock) return;
                                                                if (product.sizes && product.sizes.length > 1) {
                                                                    navigate(`/shop/${product.id}`);
                                                                } else {
                                                                    const size = product.sizes && product.sizes.length === 1 ? product.sizes[0] : undefined;
                                                                    const color = product.colors && product.colors.length === 1 ? product.colors[0] : undefined;
                                                                    addToCart(product, 1, size, color);
                                                                }
                                                            }}
                                                            className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                                                                isOutOfStock
                                                                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                                    : 'bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/20 active:scale-95'
                                                            }`}
                                                            title="Добавить в корзину"
                                                            aria-label="В корзину"
                                                        >
                                                            <ShoppingCart size={15} className="sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-[#0e0e0e] rounded-3xl border border-white/5 p-6">
                                <ShoppingBag className="mx-auto mb-4 opacity-20 text-yellow-500" size={60} />
                                <p className="text-lg sm:text-xl font-bold mb-1 text-white">Ничего не найдено</p>
                                <p className="text-xs text-gray-400">Попробуйте изменить параметры поиска или сбросить фильтры</p>
                                <button
                                    onClick={resetFilters}
                                    className="mt-4 text-xs font-bold text-yellow-400 hover:underline cursor-pointer"
                                >
                                    Сбросить все фильтры
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MOBILE & TABLET BOTTOM SHEET FILTER DRAWER --- */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 z-[130] lg:hidden overflow-hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileFilterOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#111] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col z-10 overflow-hidden"
                        >
                            {/* Handle & Header */}
                            <div className="p-4 pb-2 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal size={18} className="text-yellow-400" />
                                    <h3 className="text-base font-bold text-white">Фильтры и сортировка</h3>
                                </div>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Filters Content */}
                            <div className="p-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                                {/* Sort Order */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Сортировка</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'default', label: '⭐ Хиты продаж' },
                                            { id: 'discount', label: '🏷️ По скидке' },
                                            { id: 'asc', label: '↓ Сначала дешевле' },
                                            { id: 'desc', label: '↑ Сначала дороже' }
                                        ].map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSortOrder(s.id as any)}
                                                className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                                                    sortOrder === s.id
                                                        ? 'bg-yellow-500 text-black border-yellow-400 font-extrabold shadow-md'
                                                        : 'bg-[#181818] text-gray-400 border-white/5'
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sizes */}
                                {sizes.length > 1 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Размер / Рост</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {sizes.map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                        selectedSize === size
                                                            ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                                                            : 'bg-[#181818] text-gray-400 border-white/5'
                                                    }`}
                                                >
                                                    {size === 'All' ? 'Все размеры' : size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Price Range */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Диапазон цен, ₽</h4>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">от</span>
                                            <input
                                                type="number"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-[#181818] border border-white/10 rounded-xl py-2.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="text-gray-500">—</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">до</span>
                                            <input
                                                type="number"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                                                className="w-full bg-[#181818] border border-white/10 rounded-xl py-2.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                                                placeholder="10000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Colors */}
                                {colors.length > 1 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Цвета</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {colors.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                        selectedColor === color
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-[#181818] text-gray-400 border-white/5'
                                                    }`}
                                                >
                                                    {color === 'All' ? 'Все цвета' : color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Bottom Actions */}
                            <div className="p-4 border-t border-white/10 bg-[#141414] flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <RotateCcw size={14} />
                                    <span>Сбросить</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center justify-center"
                                >
                                    Показать товары ({filteredProducts.length})
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Shop;
