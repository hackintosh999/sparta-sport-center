import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

const GIPHY_API_KEY = '0UTRbFz4VfWSTWrr0EB6u7vY0p7K6mJg'; // Modern public beta key

// Fallback GIFs in case API fails
const FALLBACK_GIFS = [
    // Sports & Football
    { id: '1', images: { fixed_height: { url: 'https://i.giphy.com/3o7TKMGpxx8Xy5EIBO.gif' } }, title: 'Goal' },
    { id: '2', images: { fixed_height: { url: 'https://i.giphy.com/l0HlHFRbmaZtBRhXG.gif' } }, title: 'Training' },
    { id: '3', images: { fixed_height: { url: 'https://i.giphy.com/3o7abKhOpu0NwenH3O.gif' } }, title: 'Team' },
    { id: '4', images: { fixed_height: { url: 'https://i.giphy.com/l0ExghDSR6kZq63vG.gif' } }, title: 'Success' },
    { id: '5', images: { fixed_height: { url: 'https://i.giphy.com/l41lSNoT6fVlT0Zdm.gif' } }, title: 'Gym' },
    { id: '6', images: { fixed_height: { url: 'https://i.giphy.com/3o7TKL8adPjL8e4mZ2.gif' } }, title: 'Motivation' },

    // Reactions from GitHub Repo
    { id: '7', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/i-feel-like-that-needs-to-be-celebrated.gif' } }, title: 'Celebrate' },
    { id: '8', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/yas-yas-yas-yas.gif' } }, title: 'Yas!' },
    { id: '9', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/slow-nod.gif' } }, title: 'Nod' },
    { id: '10', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/like-a-boss.gif' } }, title: 'Like a Boss' },
    { id: '11', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/yes-thats-awesome.gif' } }, title: 'Awesome' },
    { id: '12', images: { fixed_height: { url: 'https://raw.githubusercontent.com/bennadel/Bens-Reaction-GIFs/master/src/assets/images/gifs/rainbow-vomit.gif' } }, title: 'Wow!' },

    // Animals & More
    { id: '13', images: { fixed_height: { url: 'https://i.giphy.com/vFKz2OqZf2Y2A.gif' } }, title: 'Cat' },
    { id: '14', images: { fixed_height: { url: 'https://i.giphy.com/3o7TKP9W2dJp8U8E6.gif' } }, title: 'Dog' },
    { id: '15', images: { fixed_height: { url: 'https://i.giphy.com/l0HlVuzUqDQU5fS6Y.gif' } }, title: 'Victory' },
    { id: '16', images: { fixed_height: { url: 'https://i.giphy.com/3o8dFsK2Emm15pGvWw.gif' } }, title: 'Skills' }
];

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [trending, setTrending] = useState<any[]>([]);

    useEffect(() => {
        fetchTrending();
    }, []);

    const fetchTrending = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`);
            const { data } = await response.json();
            if (data && data.length > 0) {
                setTrending(data);
                setGifs(data);
            } else {
                setTrending(FALLBACK_GIFS);
                setGifs(FALLBACK_GIFS);
            }
        } catch (error) {
            console.error('Error fetching trending GIFs:', error);
            setTrending(FALLBACK_GIFS);
            setGifs(FALLBACK_GIFS);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearch(query);
        if (!query.trim()) {
            setGifs(trending);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`);
            const { data } = await response.json();
            if (data && data.length > 0) {
                setGifs(data);
            } else {
                setGifs([]);
            }
        } catch (error) {
            console.error('Error searching GIFs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-4 w-80 h-96 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[100]"
        >
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Поиск GIF..."
                        className="w-full bg-black/40 text-white text-sm rounded-xl pl-10 pr-4 py-2 border border-white/10 focus:border-sparta-gold outline-none transition-colors"
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loading && gifs.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="text-sparta-gold animate-spin" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {gifs.map((gif) => (
                            <button
                                key={gif.id}
                                onClick={() => onSelect(gif.images.fixed_height.url)}
                                className="relative aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-sparta-gold transition-colors bg-white/5 group"
                            >
                                <img
                                    src={gif.images.fixed_height.url}
                                    alt={gif.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
                {!loading && gifs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-white/40 text-sm">
                        Ничего не найдено
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-white/5 bg-black/20 flex justify-between items-center">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">Powered by GIPHY</p>
                <button
                    onClick={onClose}
                    className="text-[10px] text-white/40 hover:text-white transition-colors"
                >
                    Закрыть
                </button>
            </div>
        </motion.div>
    );
};

export default GifPicker;