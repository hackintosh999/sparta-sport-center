import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { Calendar, ArrowRight, Clock, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface RelatedNewsListProps {
    category: string;
    currentId: string;
    onSelect: (item: any) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    all: 'Все',
    competitions: 'Соревнования',
    club_life: 'Жизнь клуба',
    tips: 'Советы',
    announcements: 'Объявления'
};

const RelatedNewsList: React.FC<RelatedNewsListProps> = ({ category, currentId, onSelect }) => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelated = async () => {
            try {
                // 1. Fetch a broad pool of candidates
                const q = query(
                    collection(db, "news"),
                    where("status", "==", "published"),
                    limit(30)
                );
                const snapshot = await getDocs(q);
                const candidates = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((item: any) => item.id !== currentId);

                // 2. Scoring Algorithm
                const scoredNews = candidates.map((item: any) => {
                    let score = 0;
                    const isHot = (new Date().getTime() - (item.createdAt?.seconds * 1000 || 0)) < 24 * 60 * 60 * 1000;

                    // Category match (Strong signal)
                    if (item.category === category) score += 12;

                    // Title similarity (Word matching)
                    const currentTitleWords = news.find(n => n.id === currentId)?.title?.toLowerCase().split(/\s+/) || [];
                    const itemTitleWords = item.title?.toLowerCase().split(/\s+/) || [];
                    const commonWords = itemTitleWords.filter((w: string) => w.length > 3 && currentTitleWords.includes(w));
                    score += commonWords.length * 5;

                    // Engagement (Popularity)
                    score += Math.min((item.likes || 0) / 2, 10);

                    // Recency (Freshness)
                    if (isHot) score += 8;

                    return { ...item, score, isTrending: (item.likes || 0) > 10 && item.category !== category };
                });

                // 3. Sort by score
                const sorted = scoredNews.sort((a, b) => b.score - a.score);

                // 4. Ensure Diversity (Mix of category match and high engagement)
                const result: any[] = [];
                const seenCategories = new Set();

                sorted.forEach(item => {
                    if (result.length >= 3) return;

                    // We want at least one from the same category if available
                    if (result.length === 0 && item.category === category) {
                        result.push(item);
                        seenCategories.add(item.category);
                    }
                    // Then prefer diversity or high scores
                    else if (!seenCategories.has(item.category) || result.length < 2) {
                        result.push(item);
                        seenCategories.add(item.category);
                    }
                });

                // Fill if still less than 3
                if (result.length < 3) {
                    sorted.forEach(item => {
                        if (result.length < 3 && !result.find(r => r.id === item.id)) {
                            result.push(item);
                        }
                    });
                }

                setNews(result);
            } catch (error) {
                console.error("Error fetching related news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRelated();
    }, [category, currentId]);

    if (loading) return (
        <div className="w-full flex flex-col items-center py-12">
            <div className="w-12 h-12 border-2 border-sparta-gold/20 border-t-sparta-gold rounded-full animate-spin mb-4" />
            <div className="text-white/30 text-sm font-manrope">Подбираем интересное для вас...</div>
        </div>
    );

    if (news.length === 0) return null;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-russo text-white">
                    Читайте также
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        onClick={() => onSelect(item)}
                        className="group cursor-pointer bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-sparta-gold/30 hover:bg-white/[0.07] transition-all duration-500 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col h-full"
                    >
                        <div className="h-44 overflow-hidden relative shrink-0">
                            {item.image || item.imageUrl || item.images?.[0] ? (
                                <img
                                    src={item.image || item.imageUrl || item.images?.[0]}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#111] flex items-center justify-center text-white/10 font-russo">
                                    SPARTA
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                            {/* Category Badge & Trending */}
                            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                <span className="bg-sparta-gold text-black text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg w-fit">
                                    {CATEGORY_LABELS[item.category as string] || item.category}
                                </span>
                                {item.isTrending && (
                                    <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-lg flex items-center gap-1 w-fit">
                                        <Flame size={10} fill="currentColor" />
                                        В тренде
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <div className="flex items-center gap-4 text-[10px] text-white/40 mb-3 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={12} className="text-sparta-gold" />
                                    {item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'd MMM', { locale: ru }) : 'Недавно'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-sparta-gold" />
                                    {item.readingTime || 2} мин
                                </span>
                            </div>

                            <h4 className="font-russo text-white text-lg mb-3 line-clamp-2 group-hover:text-sparta-gold transition-colors leading-tight">
                                {item.title}
                            </h4>

                            <div className="mt-auto flex items-center text-sparta-gold text-[10px] font-black uppercase tracking-[0.2em] gap-2 transform translate-x-[-10px] group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pt-4">
                                <div className="w-6 h-[1px] bg-sparta-gold" />
                                Читать <ArrowRight size={12} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default RelatedNewsList;
