import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, User, Check, Loader2, AlertCircle, Phone, Users, Plus, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { findChildToLink, linkParentToChild, linkParentToRegistryChild, createAndLinkChild } from '../../services/userService';
import { SPARTA_LOCATIONS } from '../../constants/cities';
import { BaseModal } from '../ui/BaseModal';

interface LinkChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string;
    parentName?: string;
    initialPhone?: string;
    onSuccess: () => void;
}

export const LinkChildModal: React.FC<LinkChildModalProps> = ({
    isOpen,
    onClose,
    parentId,
    parentName = '',
    initialPhone = '',
    onSuccess
}) => {
    const [mode, setMode] = useState<'create' | 'search'>('create');

    // Create State
    const [newChildName, setNewChildName] = useState('');
    const [newBirthYear, setNewBirthYear] = useState('2018');
    const [selectedBranchId, setSelectedBranchId] = useState('newton');
    const [isCreating, setIsCreating] = useState(false);

    // Search State
    const [childName, setChildName] = useState('');
    const [phone, setPhone] = useState(initialPhone);
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const formatPhone = (raw: string) => {
        let value = raw.replace(/\D/g, '');
        if (value.startsWith('8')) value = '7' + value.slice(1);
        if (!value.startsWith('7') && value.length > 0) value = '7' + value;
        
        let formatted = '+7';
        if (value.length > 1) formatted += ' (' + value.substring(1, 4);
        if (value.length >= 5) formatted += ') ' + value.substring(4, 7);
        if (value.length >= 8) formatted += '-' + value.substring(7, 9);
        if (value.length >= 10) formatted += '-' + value.substring(9, 11);
        
        return value.length <= 1 ? '' : formatted;
    };

    // Pre-fill phone if available
    useEffect(() => {
        if (isOpen) {
            setError('');
            setSuccessMsg('');
            if (initialPhone && !phone) {
                setPhone(formatPhone(initialPhone));
            }
        }
    }, [isOpen, initialPhone]);

    // Real-time search effect
    useEffect(() => {
        if (!isOpen || mode !== 'search') return;

        const cleanDigits = phone.replace(/\D/g, '');
        const cleanQuery = childName.trim();

        if (cleanQuery.length >= 2 || cleanDigits.length >= 7) {
            const timer = setTimeout(async () => {
                setIsSearching(true);
                setError('');
                setSuccessMsg('');
                try {
                    const found = await findChildToLink(cleanQuery, phone, parentId);
                    setResults(found);
                    if (found.length === 0) {
                        setError('Спортсмен пока не найден. Вы можете сразу создать профиль во вкладке «➕ Создать профиль».');
                    }
                } catch (err) {
                    console.error('Search error:', err);
                    setError('Ошибка при поиске.');
                } finally {
                    setIsSearching(false);
                }
            }, 200);

            return () => clearTimeout(timer);
        } else {
            setResults([]);
            setError('');
        }
    }, [childName, phone, isOpen, parentId, mode]);

    // Create & Link New Child
    const handleCreateChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentId || !newChildName.trim()) {
            setError('Пожалуйста, укажите имя или фамилию ребенка.');
            return;
        }

        const year = parseInt(newBirthYear, 10);
        if (isNaN(year) || year < 2010 || year > 2024) {
            setError('Укажите корректный год рождения (от 2010 до 2024).');
            return;
        }

        setIsCreating(true);
        setError('');
        setSuccessMsg('');

        try {
            const matchedBranch = SPARTA_LOCATIONS.find(l => l.id === selectedBranchId) || SPARTA_LOCATIONS[0];
            const cleanChildAge = 2026 - year;

            const res = await createAndLinkChild(parentId, {
                childName: newChildName.trim(),
                birthYear: year,
                childAge: cleanChildAge,
                branchId: matchedBranch.id,
                branchName: matchedBranch.name,
                cityId: matchedBranch.cityId,
                cityName: (matchedBranch as any).cityName || 'Челябинск',
                groupName: `Группа ${year} г.р.`,
                coachName: 'Якупов Павел Валерьевич'
            });

            if (res.success) {
                confetti({
                    particleCount: 130,
                    spread: 90,
                    origin: { y: 0.6 },
                    colors: ['#D4AF37', '#FFFFFF', '#10B981']
                });
                setSuccessMsg(`✓ Спортсмен ${newChildName.trim()} успешно добавлен в вашу семью!`);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1000);
            } else {
                setError(res.message || 'Ошибка при создании профиля.');
            }
        } catch (err: any) {
            console.error('Create child error:', err);
            setError(err.message || 'Ошибка при создании профиля.');
        } finally {
            setIsCreating(false);
        }
    };

    // Link Existing Child
    const handleLink = async (candidate: any) => {
        if (!parentId) return;

        setIsLinking(true);
        setError('');
        setSuccessMsg('');

        try {
            if (candidate.type === 'user') {
                const res = await linkParentToChild(parentId, candidate.id);
                if (res.success) {
                    confetti({
                        particleCount: 120,
                        spread: 90,
                        origin: { y: 0.6 },
                        colors: ['#D4AF37', '#FFFFFF', '#10B981']
                    });
                    setSuccessMsg(`✓ Спортсмен ${candidate.name} успешно привязан к вашему кабинету!`);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1000);
                } else {
                    setError(res.message || 'Не удалось привязать ребенка.');
                }
            } else {
                // Link from pending_students
                const result = await linkParentToRegistryChild(parentId, candidate.id, candidate.name);
                if (result.success) {
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#D4AF37', '#FFFFFF', '#000000']
                    });
                    setSuccessMsg(`✓ Спортсмен ${candidate.name} успешно привязан из реестра!`);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1000);
                } else {
                    setError(result.error || 'Ошибка при привязке.');
                }
            }
        } catch (err: any) {
            console.error('Link error:', err);
            setError('Ошибка при привязке.');
        } finally {
            setIsLinking(false);
        }
    };

    const matchedLocation = SPARTA_LOCATIONS.find(l => l.id === selectedBranchId) || SPARTA_LOCATIONS[0];
    const calcAge = 2026 - (parseInt(newBirthYear, 10) || 2018);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-[120]"
        >
            <div className="relative space-y-5 text-left font-manrope">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center border border-sparta-gold/40 shadow-md">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                                Дети в семье
                            </h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                Добавление любого количества спортсменов
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('create');
                            setError('');
                            setSuccessMsg('');
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            mode === 'create'
                                ? 'bg-sparta-gold text-black shadow-md font-black'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Plus size={14} />
                        <span>Создать профиль</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('search');
                            setError('');
                            setSuccessMsg('');
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            mode === 'search'
                                ? 'bg-sparta-gold text-black shadow-md font-black'
                                : 'text-white/60 hover:text-white'
                        }`}
                    >
                        <Search size={14} />
                        <span>Найти в базе</span>
                    </button>
                </div>

                {/* MODE 1: CREATE NEW CHILD */}
                {mode === 'create' && (
                    <form onSubmit={handleCreateChild} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                👦 Имя и фамилия ребёнка:
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                <input
                                    type="text"
                                    value={newChildName}
                                    onChange={(e) => setNewChildName(e.target.value)}
                                    placeholder="Например: Артём Иванов"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 outline-none focus:border-sparta-gold transition-all text-xs font-semibold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                            <div>
                                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                    📅 Год рождения:
                                </label>
                                <input
                                    type="number"
                                    min="2010"
                                    max="2024"
                                    value={newBirthYear}
                                    onChange={(e) => setNewBirthYear(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-3.5 text-white placeholder-white/30 outline-none focus:border-sparta-gold transition-all text-xs font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                    📍 Филиал Спарты:
                                </label>
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-3 text-white outline-none focus:border-sparta-gold transition-all text-xs font-semibold cursor-pointer"
                                >
                                    {SPARTA_LOCATIONS.map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name} {(loc as any).cityName ? `(${(loc as any).cityName})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Preview Card */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-sparta-gold">
                                    Группа {newBirthYear} г.р. ({calcAge > 0 ? `${calcAge} лет` : '...'})
                                </span>
                                <p className="text-white/80 font-semibold">{matchedLocation.name}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                <ShieldCheck size={13} />
                                <span>Готов к привязке</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isCreating || !newChildName.trim()}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                        >
                            {isCreating ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    <Plus size={16} />
                                    <span>Создать и привязать к семье</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* MODE 2: SEARCH IN REGISTRY */}
                {mode === 'search' && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                <input
                                    type="text"
                                    value={childName}
                                    onChange={(e) => setChildName(e.target.value)}
                                    placeholder="Фамилия или имя ребенка"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 outline-none focus:border-sparta-gold transition-all text-xs font-semibold"
                                />
                            </div>

                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                                    placeholder="Телефон родителя (+7 9XX XXX-XX-XX)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 outline-none focus:border-sparta-gold transition-all text-xs font-semibold"
                                />
                            </div>
                        </div>

                        {isSearching && (
                            <div className="flex items-center justify-center py-3 gap-2.5 text-sparta-gold">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Ищем в реестре Спарты...</span>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                <p className="text-[10px] font-bold text-sparta-gold uppercase tracking-wider">
                                    Найдено в базе Спарты: {results.length}
                                </p>
                                {results.map((candidate) => (
                                    <motion.div
                                        key={candidate.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => !isLinking && handleLink(candidate)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                                    >
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">⚽</span>
                                                <h4 className="text-white font-russo text-sm uppercase truncate group-hover:text-sparta-gold transition-colors">
                                                    {candidate.name}
                                                </h4>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/60">
                                                {candidate.age ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-bold">
                                                        {candidate.age} лет
                                                    </span>
                                                ) : null}
                                                <span className="px-2 py-0.5 rounded-md bg-sparta-gold/20 text-sparta-gold font-bold">
                                                    {candidate.groupName || 'Группа Sparta'}
                                                </span>
                                                {candidate.type === 'pending' && (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                                                        В реестре клуба
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={isLinking}
                                            className="px-3.5 py-2 rounded-xl bg-sparta-gold text-black font-extrabold text-xs shrink-0 shadow-md group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            {isLinking ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Check size={14} />
                                                    <span>Привязать</span>
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs"
                    >
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="font-semibold leading-relaxed">{error}</p>
                    </motion.div>
                )}

                {/* Success Message */}
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold"
                    >
                        <Check size={16} className="shrink-0 text-emerald-400" />
                        <p>{successMsg}</p>
                    </motion.div>
                )}
            </div>
        </BaseModal>
    );
};

export default LinkChildModal;