import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Tag, ExternalLink, Loader2, ArrowLeft, Filter, ChevronDown, Check, Heart, ShoppingCart } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Product } from '../types/shop';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';


const Shop = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, setIsCartOpen, cartCount } = useCart();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedColor, setSelectedColor] = useState('All');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const allColors = Array.from(new Set(products.flatMap(p => p.colors || [])));
    const colors = ['All', ...allColors];

    // Filter logic
    const filteredProducts = products.filter(p => {
        if (p.isHidden) return false;

        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' ||
            (selectedCategory === 'Favorites' ? isFavorite(p.id) : p.category === selectedCategory);
        const matchesColor = selectedColor === 'All' || p.colors?.includes(selectedColor);
        return matchesSearch && matchesCategory && matchesColor;
    }).sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);

    return (
        <div className="min-h-screen bg-surface text-primary font-manrope">
            <SEO
                title="Магазин экипировки"
                description="Официальный магазин спортивной экипировки SPARTA. Форма, аксессуары и оборудование высшего качества."
                keywords="магазин спарта, футбольная форма, спортивная экипировка, купить футбольную форму"
            />
            {/* Floating Cart Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 bg-yellow-500 text-black p-3.5 sm:p-4 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-110 transition-transform flex items-center justify-center"
            >
                <ShoppingCart size={22} className="sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border-2 border-[#020202]">
                        {cartCount}
                    </span>
                )}
            </motion.button>

            {/* Header / Hero */}
            <div className="relative overflow-hidden bg-surface-dark border-b border-card-border/5 pb-16 pt-32 px-6">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-yellow-500/20 rounded-full blur-[120px]" />
                    <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-yellow-600/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group w-fit"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        На главную
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl md:text-7xl font-transducer font-black text-white mb-4 uppercase tracking-tighter leading-none"
                            >
                                МАГАЗИН<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">SPARTA</span>
                            </motion.h1>
                            <p className="text-gray-400 text-lg max-w-xl border-l-2 border-yellow-500 pl-4">
                                Официальная экипировка футбольного клуба Sparta. Выбирай только лучшее.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12 relative z-20">
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="md:hidden w-full mb-6 flex items-center justify-between bg-surface-dark border border-card-border/10 p-4 rounded-xl text-primary font-bold"
                >
                    <span className="flex items-center gap-2"><Filter size={20} className="text-yellow-500" /> Фильтры</span>
                    <ChevronDown className={`transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`flex flex-col lg:flex-row gap-8 mb-10 ${isFiltersOpen ? 'block' : 'hidden md:flex'}`}>
                    {/* Filters Sidebar */}
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Найти экипировку..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:bg-[#1a1a1a] transition-all"
                            />
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Сортировка</h3>
                            <div className="flex bg-[#111] p-1 rounded-xl border border-white/5">
                                <button onClick={() => setSortOrder('asc')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sortOrder === 'asc' ? 'bg-[#222] text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>Сначала недорогие</button>
                                <button onClick={() => setSortOrder('desc')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sortOrder === 'desc' ? 'bg-[#222] text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>Сначала премиум</button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Категории</h3>
                            <div className="space-y-1.5">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex justify-between items-center ${selectedCategory === cat
                                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                            : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-white/5'
                                            }`}
                                    >
                                        {cat === 'All' ? 'Все товары' : cat}
                                        {selectedCategory === cat && <Check size={16} />}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setSelectedCategory('Favorites')}
                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 ${selectedCategory === 'Favorites'
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                    : 'bg-[#111] text-gray-400 hover:text-red-500 border border-white/5 hover:border-red-500/20'
                                    }`}
                            >
                                <Heart size={18} fill={selectedCategory === 'Favorites' ? "currentColor" : "none"} />
                                Избранное
                            </button>
                        </div>

                        {colors.length > 1 && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Цвета</h3>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedColor === color
                                                ? 'bg-white text-black border-white'
                                                : 'bg-[#111] text-gray-400 border-white/5 hover:border-white/20 hover:bg-[#1a1a1a]'
                                                }`}
                                        >
                                            {color === 'All' ? 'Все цвета' : color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 opacity-50">
                                <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
                                <p className="font-mono text-sm uppercase tracking-widest">Загрузка каталога...</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                <AnimatePresence>
                                    {filteredProducts.map((product, index) => {
                                        const totalStock = typeof product.stock === 'number' ? product.stock : (typeof product.stock === 'object' && product.stock !== null ? Object.values(product.stock as unknown as Record<string, number>).reduce((a: number, b: number) => a + (Number(b) || 0), 0) : 999);
                                        const isOutOfStock = totalStock <= 0;

                                        return (
                                            <motion.div
                                                key={product.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                                                className={`group bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden hover:border-yellow-500/30 transition-all hover:bg-[#111] shadow-2xl shadow-black/50 flex flex-col ${isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                            >
                                                <div
                                                    className="relative aspect-[4/5] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] overflow-hidden cursor-pointer"
                                                    onClick={() => navigate(`/shop/${product.id}`)}
                                                >
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.title}
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                                const parent = (e.target as HTMLElement).parentElement;
                                                                if (parent) {
                                                                    const fallback = parent.querySelector('.img-fallback');
                                                                    if (fallback) fallback.classList.remove('hidden');
                                                                }
                                                            }}
                                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                                        />
                                                    ) : null}
                                                    <div className={`w-full h-full flex items-center justify-center text-gray-800 img-fallback ${product.imageUrl ? 'hidden' : ''}`}>
                                                        <ShoppingBag size={64} />
                                                    </div>

                                                    {isOutOfStock && (
                                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                            <span className="px-6 py-2 bg-red-600 text-white font-black uppercase tracking-widest text-sm rounded-full shadow-2xl scale-110 border border-red-500/50">
                                                                Нет в наличии
                                                            </span>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                                                        className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:scale-110 hover:bg-black/60 transition-all z-20 shadow-lg border border-white/5"
                                                    >
                                                        <Heart size={20} fill={isFavorite(product.id) ? "#ef4444" : "none"} className={isFavorite(product.id) ? "text-red-500" : "text-white"} />
                                                    </button>

                                                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                                                        <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/10 uppercase tracking-widest shadow-lg">
                                                            {product.category}
                                                        </span>
                                                        {!isOutOfStock && product.badges?.includes('hit') && <span className="px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-red-500/20 uppercase tracking-widest">Хит Продаж</span>}
                                                        {!isOutOfStock && product.badges?.includes('new') && <span className="px-3 py-1 bg-green-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-green-500/20 uppercase tracking-widest">Новинка</span>}
                                                        {!isOutOfStock && product.badges?.includes('last_chance') && <span className="px-3 py-1 bg-orange-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-orange-500/20 uppercase tracking-widest">Последний Шанс</span>}
                                                    </div>
                                                </div>

                                                <div className="p-6 flex flex-col flex-1 relative">
                                                    <div className="mb-4">
                                                        <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-yellow-500 transition-colors line-clamp-1">{product.title}</h3>
                                                        {product.colors && product.colors.length > 0 && (
                                                            <div className="flex gap-1.5 mt-2">
                                                                {product.colors.map(c => {
                                                                    let bgStyle = { background: '#888' };
                                                                    if (c === 'Белый') bgStyle.background = '#fff';
                                                                    else if (c === 'Черный') bgStyle.background = '#000';
                                                                    else if (c === 'Синий') bgStyle.background = '#1d4ed8';
                                                                    else if (c === 'Красный') bgStyle.background = '#dc2626';
                                                                    else if (c === 'Зеленый' || c === 'Неоново-Зеленый') bgStyle.background = '#16a34a';
                                                                    else if (c === 'Желтый') bgStyle.background = '#ca8a04';
                                                                    else if (c === 'Белый/Темно-Синий') bgStyle.background = 'linear-gradient(135deg, #fff 50%, #172554 50%)';
                                                                    else if (c === 'Красный/Черный') bgStyle.background = 'linear-gradient(135deg, #dc2626 50%, #000 50%)';
                                                                    else if (c === 'Антрацит/Черный') bgStyle.background = 'linear-gradient(135deg, #4b5563 50%, #000 50%)';
                                                                    else if (c === 'Черный/Салатовый') bgStyle.background = 'linear-gradient(135deg, #000 50%, #4ade80 50%)';

                                                                    return (
                                                                        <div key={c} className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner" style={bgStyle} title={c} />
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">{product.description}</p>

                                                    <div className="mt-auto flex items-center justify-between gap-4">
                                                        {product.oldPrice && product.oldPrice > product.price ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-xl md:text-2xl font-black text-red-500 tracking-tight leading-none">
                                                                        {product.price.toLocaleString()} ₽
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-bold rounded">
                                                                        -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                                                    </span>
                                                                </div>
                                                                <span className="font-mono text-sm text-gray-500 line-through tracking-tight leading-none">
                                                                    {product.oldPrice.toLocaleString()} ₽
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="font-mono text-2xl font-bold text-yellow-500 tracking-tight">
                                                                {product.price.toLocaleString()} ₽
                                                            </div>
                                                        )}

                                                        <button
                                                            disabled={isOutOfStock}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isOutOfStock) return;
                                                                if (product.sizes && product.sizes.length > 1) {
                                                                    navigate(`/shop/${product.id}`); // Require size selection first
                                                                } else {
                                                                    // If only one size, auto-select it or add as 'N/A'
                                                                    const size = (product.sizes && product.sizes.length === 1) ? product.sizes[0] : undefined;
                                                                    const color = (product.colors && product.colors.length === 1) ? product.colors[0] : undefined;
                                                                    addToCart(product, 1, size, color);
                                                                }
                                                            }}
                                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group/btn ${isOutOfStock ? 'bg-white/5 text-white/20' : 'bg-white/5 hover:bg-yellow-500 text-white hover:text-black'}`}
                                                        >
                                                            <ShoppingCart size={20} className={isOutOfStock ? '' : "group-hover/btn:-translate-y-0.5 transition-transform"} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="text-center py-32 text-secondary bg-surface-dark rounded-3xl border border-card-border/5">
                                <ShoppingBag className="mx-auto mb-6 opacity-20" size={80} />
                                <p className="text-2xl font-black mb-2 text-white">Ничего не найдено</p>
                                <p className="text-sm">Попробуйте сбросить фильтры или изменить запрос</p>
                                <button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedColor('All'); }} className="mt-6 text-yellow-500 font-bold hover:underline">Сбросить фильтры</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Shop;
