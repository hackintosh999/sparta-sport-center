import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Copy, Check, Car, Building2, X, Phone, Compass, ExternalLink } from 'lucide-react';
import { LocationItem } from '../types/city';
import { SPARTA_LOCATIONS } from '../constants/cities';
import { useCity } from '../context/CityContext';

interface RouteModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLocationId?: string;
    locations?: LocationItem[];
}

export const RouteModal: React.FC<RouteModalProps> = ({
    isOpen,
    onClose,
    initialLocationId = 'newton',
    locations: propLocations
}) => {
    const { allLocations } = useCity();
    const [selectedId, setSelectedId] = useState<string>(initialLocationId);
    const [copied, setCopied] = useState(false);
    const [photoIdx, setPhotoIdx] = useState(0);

    const sourceLocations = (propLocations && propLocations.length > 0)
        ? propLocations
        : (allLocations && allLocations.length > 0 ? allLocations : SPARTA_LOCATIONS);

    const activeLocations = sourceLocations.filter(l => l.status !== 'hidden');
    const currentLocation = activeLocations.find(l => l.id === selectedId) || activeLocations[0] || SPARTA_LOCATIONS[0];

    const openYandexNavi = (loc: LocationItem) => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        // Correct Yandex.Navigator API parameters: lat_to & lon_to
        const naviUrl = `yandexnavi://build_route_on_map?lat_to=${loc.lat}&lon_to=${loc.lon}`;
        const queryText = `${loc.city}, ${loc.address}`;
        const webUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(queryText)}&rtext=~${loc.lat},${loc.lon}&rtt=auto`;

        if (isMobile) {
            const start = Date.now();
            window.location.href = naviUrl;
            setTimeout(() => {
                if (Date.now() - start < 2000) {
                    window.open(webUrl, '_blank');
                }
            }, 1200);
        } else {
            window.open(webUrl, '_blank');
        }
    };

    const openYandexMaps = (loc: LocationItem) => {
        const queryText = `${loc.city}, ${loc.address}`;
        const webUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(queryText)}&ll=${loc.lon}%2C${loc.lat}&z=17`;
        window.open(webUrl, '_blank');
    };

    const open2GIS = (loc: LocationItem) => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const dgisAppUrl = `dgis://2gis.ru/routeSearch/to/${loc.lon},${loc.lat}`;
        const queryText = `${loc.city}, ${loc.address}`;
        const webUrl = `https://2gis.ru/search/${encodeURIComponent(queryText)}`;

        if (isMobile) {
            const start = Date.now();
            window.location.href = dgisAppUrl;
            setTimeout(() => {
                if (Date.now() - start < 2000) {
                    window.open(webUrl, '_blank');
                }
            }, 1200);
        } else {
            window.open(webUrl, '_blank');
        }
    };

    const handleCopyAddress = (loc: LocationItem) => {
        const textToCopy = `${loc.name}: ${loc.city}, ${loc.address}. (${loc.details})`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Box / Bottom Sheet */}
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="bg-[#121212] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Mobile Pull Indicator */}
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden" />

                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-sparta-gold/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                                    <Compass size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-russo text-white">Проложить маршрут</h3>
                                    <p className="text-xs text-white/50">Выберите нужный зал SPARTA</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Location Tabs */}
                        <div className="p-4 bg-black/40 border-b border-white/5 overflow-x-auto scrollbar-none flex gap-2">
                            {activeLocations.map((loc) => {
                                const isActive = loc.id === (currentLocation?.id || selectedId);
                                return (
                                    <button
                                        key={loc.id}
                                        onClick={() => setSelectedId(loc.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                                            isActive
                                                ? 'bg-gold-gradient text-black border-sparta-gold shadow-lg shadow-sparta-gold/20'
                                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        <MapPin size={14} />
                                        {loc.shortName || loc.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Location Details */}
                        {currentLocation && (() => {
                            const allPhotos: Array<{ url: string; title: string }> = [];

                            if (currentLocation.imageUrl) {
                                allPhotos.push({ url: currentLocation.imageUrl, title: 'Главный вход / Фасад' });
                            }

                            if (currentLocation.galleryItems && currentLocation.galleryItems.length > 0) {
                                currentLocation.galleryItems.forEach(g => {
                                    if (g.url && !allPhotos.some(p => p.url === g.url)) {
                                        allPhotos.push(g);
                                    }
                                });
                            } else if (currentLocation.gallery && currentLocation.gallery.length > 0) {
                                currentLocation.gallery.forEach((g, idx) => {
                                    if (g && !allPhotos.some(p => p.url === g)) {
                                        allPhotos.push({ url: g, title: `Зона ${idx + 1}` });
                                    }
                                });
                            }

                            const activeItem = allPhotos[photoIdx % allPhotos.length] || allPhotos[0];

                            return (
                                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                    {/* Optional Real Photo Card */}
                                    {allPhotos.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                                                <img
                                                    src={activeItem?.url}
                                                    alt={currentLocation.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2">
                                                    <span className="text-[11px] font-bold text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 truncate max-w-[75%]">
                                                        📷 {activeItem?.title || `Фото ${photoIdx + 1}`}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold text-sparta-gold bg-black/80 px-2 py-0.5 rounded-lg border border-sparta-gold/30 shrink-0">
                                                        {(photoIdx % allPhotos.length) + 1} / {allPhotos.length}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Photo Gallery Mobile Selector Strip */}
                                            {allPhotos.length > 1 && (
                                                <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
                                                    {allPhotos.map((item, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setPhotoIdx(idx)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                                                                idx === photoIdx % allPhotos.length
                                                                    ? 'bg-gold-gradient text-black border-sparta-gold shadow-md shadow-sparta-gold/30 scale-105'
                                                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {item.title || `Зона ${idx + 1}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-base font-russo text-white">{currentLocation.name}</h4>
                                            <p className="text-sm font-semibold text-sparta-gold mt-0.5">{currentLocation.address}</p>
                                        </div>
                                        {currentLocation.badge && !currentLocation.imageUrl && (
                                            <span className="px-2.5 py-1 bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 rounded-lg text-[10px] font-bold">
                                                {currentLocation.badge}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/80 font-manrope">
                                        <div className="flex items-start gap-2">
                                            <Building2 size={16} className="text-sparta-gold shrink-0 mt-0.5" />
                                            <span><strong>Вход и этаж:</strong> {currentLocation.details}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Car size={16} className="text-sparta-gold shrink-0 mt-0.5" />
                                            <span><strong>Парковка:</strong> {currentLocation.parking}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Action Button: Yandex Navigator 1-Click */}
                                <button
                                    onClick={() => openYandexNavi(currentLocation)}
                                    className="w-full bg-gold-gradient text-black font-russo tracking-wide py-4 px-6 rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(212,175,55,0.3)] active:scale-[0.99]"
                                >
                                    <Navigation size={22} className="fill-black" />
                                    <span className="text-base">Открыть в Яндекс Навигаторе</span>
                                </button>

                                {/* Secondary Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => openYandexMaps(currentLocation)}
                                        className="py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={14} className="text-sparta-gold" />
                                        Яндекс Карты
                                    </button>

                                    <button
                                        onClick={() => open2GIS(currentLocation)}
                                        className="py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={14} className="text-sparta-gold" />
                                        2GIS
                                    </button>
                                </div>

                                 {/* Copy Address Action */}
                                <button
                                    onClick={() => handleCopyAddress(currentLocation)}
                                    className="w-full py-2.5 px-4 bg-black/40 border border-white/10 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} className="text-green-400" />
                                            <span className="text-green-400 font-bold">Адрес скопирован!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            <span>Скопировать точный адрес</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RouteModal;
