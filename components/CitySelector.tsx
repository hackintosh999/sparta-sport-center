import React, { useState, useRef, useEffect } from 'react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CitySelector: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { selectedCity, city, setCity, cities } = useCity();
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // City selection is enabled ONLY for Director and Developer roles
    const canSelectCity = Boolean(
        userProfile?.role && ['director', 'developer', 'dev', 'super'].includes(userProfile.role)
    );

    useEffect(() => {
        if (!canSelectCity && selectedCity !== 'chelyabinsk') {
            setCity('chelyabinsk');
        }
    }, [canSelectCity, selectedCity, setCity]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // For regular users / admins, completely hide city selector
    if (!canSelectCity) {
        return null;
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all shadow-sm group hover:border-sparta-gold/30"
            >
                <MapPin size={14} className="text-sparta-gold shrink-0 group-hover:scale-110 transition-transform" />
                <span className="font-manrope tracking-wide">{city.name}</span>
                <ChevronDown size={14} className={`text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180 text-sparta-gold' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute top-full mt-2 left-0 w-48 bg-[#121212] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-[100] backdrop-blur-xl"
                    >
                        <div className="px-2 py-1 mb-1 text-[10px] uppercase font-bold text-sparta-gold tracking-wider border-b border-white/5">
                            Выберите город
                        </div>
                        {cities.map((c) => {
                            const isSelected = selectedCity === c.id;
                            const isComingSoon = c.status === 'coming_soon';
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        if (!isComingSoon) {
                                            setCity(c.id);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-gold-gradient text-black font-bold shadow-md'
                                            : isComingSoon
                                            ? 'text-white/40 cursor-not-allowed'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    {isSelected && <Check size={14} className="text-black" />}
                                    {isComingSoon && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-sparta-gold font-normal">
                                            Скоро
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CitySelector;
