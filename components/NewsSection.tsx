import React, { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, where, increment, setDoc, serverTimestamp, arrayRemove, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowRight, Search, Heart, MessageCircle, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Container } from './UIComponents';
import { useAuth } from '../context/AuthContext';
import NewsModal from './NewsModal';
import { useSearchParams } from 'react-router-dom';
import { NewsItem, NewsCategory, NewsCategoryOption } from '../types/news';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES: NewsCategoryOption[] = [
    { id: 'all', label: 'Все' },
    { id: 'competitions', label: 'Соревнования' },
    { id: 'club_life', label: 'Жизнь клуба' },
    { id: 'tips', label: 'Советы' },
    { id: 'announcements', label: 'Объявления' }
];

const stripHtml = (html: string): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const SmartImage: React.FC<{ src: string; title: string; isHero?: boolean }> = ({ src, title, isHero }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <div
            className={`relative overflow-hidden w-full transition-all duration-700 bg-[#080808] ${isHero ? 'h-full absolute inset-0' : 'h-[320px]'
                }`}
        >
            {/* 1. Deep Blurred Background (Ambient Glow) */}
            <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${loaded ? 'opacity-40 blur-2xl scale-150' : 'opacity-0'
                    } group-hover:opacity-60 group-hover:scale-110`}
            />

            {/* 2. Base Layer: Sharp Cover (Fills the space, always visible) */}
            <img
                src={src}
                alt={title}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoaded(true)}
                className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-1000 ease-out ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    } ${isHero ? 'opacity-40 blur-[1px] group-hover:blur-0 group-hover:opacity-60' : 'group-hover:opacity-0 group-hover:scale-110'}`}
            />

            {/* 3. Hover Layer: Full Contain (Shows everything, fades in on hover) */}
            {!isHero && (
                <img
                    src={src}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    className="relative z-10 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-all duration-700 ease-in-out transform scale-95 group-hover:scale-100 p-2"
                />
            )}

            {!isHero && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-20 pointer-events-none group-hover:opacity-0 transition-opacity duration-500" />
            )}
        </div>
    );
};

const NewsSection: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [vkNews, setVkNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const sectionRef = useRef<HTMLElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Filters
    const [activeCategory, setActiveCategory] = useState<NewsCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // GSAP Background and Entrance Animations
    useEffect(() => {
        if (loading || !gridRef.current || !sectionRef.current) return;

        const ctx = gsap.context(() => {
            // Background parallax effect
            gsap.to('.news-bg-image', {
                y: '10%',
                ease: 'none',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });

            // Card entrance animations (Antigravity Style)
            gsap.fromTo('.news-card',
                { opacity: 0, y: 50, rotateX: 10 },
                {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: gridRef.current,
                        start: 'top 80%'
                    }
                }
            );
        }, sectionRef);

        return () => ctx.revert();
    }, [loading, activeCategory, searchQuery]);

    // Combine and Filter Logic
    const combinedNews = useMemo(() => {
        // Map of live VK items by vkId
        const vkMap = vkNews.reduce((acc: Record<string, NewsItem>, v) => {
            const idKey = String(v.vkId || v.id.replace('vk_', ''));
            acc[idKey] = v;
            return acc;
        }, {});

        // Process Firestore news items
        const firestoreProcessed = news.map(n => {
            if (n.vkId) {
                const vkIdStr = String(n.vkId);
                const liveVk = vkMap[vkIdStr];
                if (liveVk) {
                    // Merge Firestore overrides with live VK item
                    return {
                        ...liveVk,
                        ...n,
                        title: n.title || liveVk.title,
                        content: n.content || liveVk.content,
                        image: n.image || n.imageUrl || liveVk.image || liveVk.imageUrl,
                        imageUrl: n.imageUrl || n.image || liveVk.imageUrl || liveVk.image,
                        likes: (liveVk.baseLikes || 0) + (n.likes || 0),
                        status: n.status || 'published'
                    };
                }
            }
            return {
                ...n,
                status: n.status || 'published'
            };
        });

        // Add VK items that are NOT in Firestore yet
        const firestoreVkIds = new Set(news.filter(n => n.vkId).map(n => String(n.vkId)));
        const unmergedVkNews = vkNews.filter(v => {
            const idKey = String(v.vkId || v.id.replace('vk_', ''));
            return !firestoreVkIds.has(idKey);
        });

        const allNews = [...firestoreProcessed, ...unmergedVkNews];

        const qualityNews = allNews.filter(item => {
            const hasTitle = (item.title || "").trim().length >= 3;
            const hasContent = (item.content || "").trim().length >= 5;
            const hasMedia = !!(item.imageUrl || item.image);
            return hasTitle && (hasContent || hasMedia);
        });

        // Sort: Pinned first, then by date descending
        return qualityNews.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

            const timeA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? a.createdAt.seconds : 0;
            const timeB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? b.createdAt.seconds : 0;
            return timeB - timeA;
        });
    }, [news, vkNews]);

    // Deep linking
    useEffect(() => {
        const newsId = searchParams.get('newsId');
        if (newsId && !selectedNews) {
            if (newsId.startsWith('vk_')) {
                const vkItem = combinedNews.find(n => n.id === newsId);
                if (vkItem) {
                    setSelectedNews(vkItem);
                    scrollToNews();
                }
            } else {
                const fetchLinkedNews = async () => {
                    try {
                        const docSnap = await getDoc(doc(db, "news", newsId));
                        if (docSnap.exists()) {
                            setSelectedNews({ id: docSnap.id, ...docSnap.data() } as NewsItem);
                            scrollToNews();
                        }
                    } catch (error) {
                        console.error("Error fetching linked news:", error);
                    }
                };
                fetchLinkedNews();
            }
        }
    }, [searchParams, combinedNews, selectedNews]);

    const scrollToNews = () => {
        setTimeout(() => {
            const newsSection = document.getElementById('news');
            if (newsSection) {
                newsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    };

    // Fetch News (Without restrictive orderBy to capture all items)
    useEffect(() => {
        const q = query(collection(db, "news"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as NewsItem))
                .filter(item => item.status !== 'draft');
            setNews(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Advanced Auto-categorization logic with weighted scoring
    const autoCategorize = (text: string): NewsCategory => {
        const lowerText = text.toLowerCase();
        const scores: Record<NewsCategory, number> = {
            all: 0,
            competitions: 0,
            tips: 0,
            announcements: 0,
            club_life: 0
        };

        // 1. Keywords & Phrases Weights
        const weights: Record<string, { cat: NewsCategory, weight: number }> = {
            // Competitions (High Priority for specific terms)
            'матч': { cat: 'competitions', weight: 2 },
            'турнир': { cat: 'competitions', weight: 3 },
            'кубок': { cat: 'competitions', weight: 3 },
            'чемпионат': { cat: 'competitions', weight: 3 },
            'счет': { cat: 'competitions', weight: 2 },
            'победа': { cat: 'competitions', weight: 2 },
            'гол': { cat: 'competitions', weight: 2 },
            'финал': { cat: 'competitions', weight: 3 },
            'соревнование': { cat: 'competitions', weight: 2 },

            // Tips (Coach's wisdom)
            'совет': { cat: 'tips', weight: 4 },
            'упражнение': { cat: 'tips', weight: 3 },
            'тренировка': { cat: 'tips', weight: 1 }, // Common word, low weight
            'методика': { cat: 'tips', weight: 3 },
            'как правильно': { cat: 'tips', weight: 5 },
            'техника': { cat: 'tips', weight: 3 },
            'разминка': { cat: 'tips', weight: 3 },

            // Announcements (Crucial Info)
            'внимание': { cat: 'announcements', weight: 4 },
            'набор': { cat: 'announcements', weight: 5 },
            'запись': { cat: 'announcements', weight: 5 },
            'расписание': { cat: 'announcements', weight: 4 },
            'отмена': { cat: 'announcements', weight: 5 },
            'важно': { cat: 'announcements', weight: 3 },
            'просмотр': { cat: 'announcements', weight: 4 },

            // Club Life
            'поздравляем': { cat: 'club_life', weight: 4 },
            'день рождения': { cat: 'club_life', weight: 5 },
            'праздник': { cat: 'club_life', weight: 3 },
            'атмосфера': { cat: 'club_life', weight: 2 },
            'фотоотчет': { cat: 'club_life', weight: 3 }
        };

        // 2. Emoji Analysis (Very strong signal)
        const emojiWeights: Record<string, { cat: NewsCategory, weight: number }> = {
            '🏆': { cat: 'competitions', weight: 5 },
            '🥇': { cat: 'competitions', weight: 5 },
            '🥈': { cat: 'competitions', weight: 4 },
            '🥉': { cat: 'competitions', weight: 4 },
            '⚽': { cat: 'competitions', weight: 2 },
            '👟': { cat: 'tips', weight: 4 },
            '🧠': { cat: 'tips', weight: 4 },
            '📋': { cat: 'tips', weight: 3 },
            '📢': { cat: 'announcements', weight: 5 },
            '🚨': { cat: 'announcements', weight: 5 },
            '🗓': { cat: 'announcements', weight: 4 },
            '🎂': { cat: 'club_life', weight: 5 },
            '📸': { cat: 'club_life', weight: 3 },
            '🤝': { cat: 'club_life', weight: 3 },
            '🎉': { cat: 'club_life', weight: 3 }
        };

        // Calculate Scores
        Object.entries(weights).forEach(([word, info]) => {
            if (lowerText.includes(word)) scores[info.cat] += info.weight;
        });

        Object.entries(emojiWeights).forEach(([emoji, info]) => {
            if (text.includes(emoji)) scores[info.cat] += info.weight;
        });

        // Resolve Winner (with Priority)
        let bestCat: NewsCategory = 'club_life';
        let maxScore = 0;

        // Priority Order: Announcements > Competitions > Tips > Club Life
        const priority: NewsCategory[] = ['announcements', 'competitions', 'tips', 'club_life'];

        priority.forEach(cat => {
            if (scores[cat] > maxScore) {
                maxScore = scores[cat];
                bestCat = cat;
            } else if (scores[cat] === maxScore && maxScore > 0) {
                // If draw, keep the one with higher priority (already handled by order)
            }
        });

        return bestCat;
    };

    // Fetch VK News
    useEffect(() => {
        const fetchVKNews = async () => {
            try {
                const storedToken = localStorage.getItem('vk_access_token') || '';
                const headers: Record<string, string> = {};
                if (storedToken) headers['x-vk-token'] = storedToken;

                const res = await fetch('/api/vk-news?count=10', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.items) {
                        const mappedVkNews: NewsItem[] = data.items.map((post: any) => {
                            let imageUrl = '';
                            const images: string[] = [];
                            if (post.attachments) {
                                post.attachments.forEach((a: any) => {
                                    if (a.type === 'photo' && a.photo?.sizes) {
                                        const sortedSizes = a.photo.sizes.sort((s1: any, s2: any) => s2.width - s1.width);
                                        if (sortedSizes.length > 0) {
                                            const url = sortedSizes[0].url;
                                            images.push(url);
                                            if (!imageUrl) imageUrl = url;
                                        }
                                    }
                                });
                            }

                            return {
                                id: `vk_${post.id}`,
                                title: post.text.split('\n')[0].substring(0, 60) + (post.text.length > 60 ? '...' : ''),
                                content: post.text,
                                imageUrl,
                                image: imageUrl,
                                images,
                                category: autoCategorize(post.text),
                                isPinned: post.is_pinned === 1,
                                createdAt: { seconds: post.date },
                                baseLikes: post.likes?.count || 0,
                                likes: post.likes?.count || 0,
                                source: 'vkontakte' as const,
                                status: 'published' as const
                            };
                        });
                        setVkNews(mappedVkNews);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch VK news:", error);
            }
        };

        fetchVKNews();
    }, []);

    const filteredNews = useMemo(() => {
        return combinedNews.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.tags && item.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
            return matchesCategory && matchesSearch;
        });
    }, [combinedNews, activeCategory, searchQuery]);

    const handleLike = async (e: React.MouseEvent, item: NewsItem) => {
        e.stopPropagation();
        if (!currentUser) {
            alert("Войдите, чтобы оценить!");
            return;
        }

        const newsRef = doc(db, "news", item.id);
        const isLiked = item.likedBy?.includes(currentUser.uid);

        try {
            await setDoc(newsRef, {
                title: item.title || "",
                category: item.category || "club_life",
                source: item.source || "sparta",
                vkId: item.id.startsWith('vk_') ? item.id.replace('vk_', '') : null,
                baseLikes: item.baseLikes || 0,
                likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
                likes: increment(isLiked ? -1 : 1),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error liking:", error);
        }
    };

    return (
        <section id="news" ref={sectionRef} className="py-24 bg-[#050505] relative min-h-screen overflow-hidden perspective-1000">
            {/* 3D Generated Background */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                <div
                    className="news-bg-image absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
                    style={{ backgroundImage: 'url("/bg-news-v8.png")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] opacity-40" />
            </div>

            <Container className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-sparta-gold font-bold tracking-widest uppercase text-xs mb-3 block"
                        >
                            Медиа-центр • Sparta Digital
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-russo text-white"
                        >
                            Блог <span className="text-transparent bg-clip-text bg-gradient-to-r from-sparta-gold via-yellow-400 to-yellow-700">Спарты</span>
                        </motion.h2>
                    </div>

                    <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                        <div className="relative group w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Поиск новостей..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-sparta-gold/50 outline-none transition-all group-hover:bg-white/10 backdrop-blur-sm"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-sparta-gold transition-colors" size={20} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modern Glassmorphism Filters */}
                <div className="flex flex-wrap justify-center gap-3 mb-16 relative z-10 px-4">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`group relative px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${isActive
                                        ? 'text-black'
                                        : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {/* Background Layers */}
                                <div className={`absolute inset-0 transition-all duration-500 ${isActive
                                        ? 'bg-sparta-gold scale-100 opacity-100'
                                        : 'bg-white/5 backdrop-blur-md border border-white/10 scale-95 opacity-80 group-hover:bg-white/10 group-hover:scale-100 group-hover:opacity-100'
                                    }`} />

                                {/* Inner Glow for Active */}
                                {isActive && (
                                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] mix-blend-overlay" />
                                )}

                                <span className="relative z-10">{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-fr">
                    <AnimatePresence mode="popLayout">
                        {filteredNews.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="col-span-full py-32 text-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.02] backdrop-blur-md"
                            >
                                <Search size={64} className="mx-auto text-white/10 mb-6" />
                                <p className="text-2xl font-russo text-white mb-2">Пусто</p>
                                <p className="text-white/40 font-manrope">Попробуйте изменить параметры поиска или категорию</p>
                            </motion.div>
                        ) : (
                            filteredNews.map((item, index) => {
                                const isHero = index === 0 && activeCategory === 'all' && !searchQuery && item.isPinned;
                                const imageSrc = item.imageUrl || item.image;

                                return (
                                    <article
                                        key={`${item.id}-${index}`}
                                        onClick={() => {
                                            setSelectedNews(item);
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.set('newsId', item.id);
                                            setSearchParams(newParams, { replace: true });
                                        }}
                                        className={`news-card group cursor-pointer relative flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-sparta-gold/50 transition-all duration-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isHero ? 'md:col-span-2 lg:col-span-2 h-[580px]' : 'h-[580px]'
                                            }`}
                                    >
                                        {/* Image Container */}
                                        <div className={`${isHero ? 'absolute inset-0 z-0' : 'relative h-[300px]'}`}>
                                            {imageSrc ? (
                                                <SmartImage src={imageSrc} title={item.title} isHero={isHero} />
                                            ) : (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                    <span className="text-white/10 font-russo text-3xl tracking-tighter">SPARTA</span>
                                                </div>
                                            )}

                                            {!isHero && (
                                                <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
                                                    {item.category && (
                                                        <span className="bg-sparta-gold text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl uppercase tracking-widest">
                                                            {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                                                        </span>
                                                    )}
                                                    {/* NEW Hot Badge */}
                                                    {(() => {
                                                        const postDate = item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : new Date();
                                                        const isNew = (new Date().getTime() - postDate.getTime()) < 24 * 60 * 60 * 1000;
                                                        return isNew && (
                                                            <motion.span
                                                                animate={{ scale: [1, 1.1, 1] }}
                                                                transition={{ repeat: Infinity, duration: 2 }}
                                                                className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-tighter w-fit flex items-center gap-1"
                                                            >
                                                                <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                                                                HOT
                                                            </motion.span>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className={`relative z-10 flex flex-col flex-1 p-8 ${isHero ? 'justify-end h-full' : ''}`}>
                                            <div className="flex items-center gap-4 text-[10px] text-sparta-gold font-bold mb-3 uppercase tracking-widest opacity-80">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={12} />
                                                    {(() => {
                                                        if (!item.createdAt) return 'СЕГОДНЯ';
                                                        if (typeof item.createdAt === 'object' && 'seconds' in item.createdAt) {
                                                            return format(new Date(item.createdAt.seconds * 1000), 'd MMMM', { locale: ru });
                                                        }
                                                        if (typeof item.createdAt === 'number') {
                                                            return format(new Date(item.createdAt * (item.createdAt > 1e11 ? 1 : 1000)), 'd MMMM', { locale: ru });
                                                        }
                                                        return 'СЕГОДНЯ';
                                                    })()}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {item.readingTime || 2} МИН
                                                </span>
                                            </div>

                                            <h3 className={`font-russo text-white mb-3 group-hover:text-sparta-gold transition-colors leading-[1.1] ${isHero ? 'text-3xl md:text-5xl max-w-2xl' : 'text-xl line-clamp-2'}`}>
                                                {item.title}
                                            </h3>

                                            <p className={`text-white/40 text-sm leading-relaxed mb-6 font-manrope ${isHero ? 'text-lg max-w-xl line-clamp-2' : 'line-clamp-3'}`}>
                                                {stripHtml(item.content)}
                                            </p>

                                            <div className="mt-auto flex items-center justify-between pt-5 border-t border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <button
                                                        onClick={(e) => handleLike(e, item)}
                                                        className="flex items-center gap-2 group/like"
                                                    >
                                                        <Heart
                                                            size={20}
                                                            className={`transition-all duration-500 ${item.likedBy?.includes(currentUser?.uid || '')
                                                                ? 'fill-red-500 text-red-500 scale-125'
                                                                : 'text-white/30 group-hover/like:text-red-500'
                                                                }`}
                                                        />
                                                        <span className={`text-sm font-bold ${item.likedBy?.includes(currentUser?.uid || '') ? 'text-white' : 'text-white/30'}`}>
                                                            {item.likes || 0}
                                                        </span>
                                                    </button>
                                                    <div className="flex items-center gap-2 text-white/30 hover:text-white transition-colors cursor-pointer">
                                                        <MessageCircle size={20} />
                                                        <span className="text-[10px] font-black tracking-widest">ОБСУДИТЬ</span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-sparta-gold group-hover:bg-sparta-gold group-hover:text-black transition-all duration-500">
                                                    <ArrowRight size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </Container>

            {/* Modal */}
            <AnimatePresence>
                {selectedNews && (
                    <NewsModal
                        news={selectedNews}
                        onClose={() => {
                            setSelectedNews(null);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.delete('newsId');
                            setSearchParams(newParams, { replace: true });
                        }}
                    />
                )}
            </AnimatePresence>
        </section >
    );
};

export default NewsSection;
