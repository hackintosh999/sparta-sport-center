import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Check, Loader2, AlertCircle, Phone, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { findChildToLink, linkParentToChild, linkParentToRegistryChild, sendLinkingRequest } from '../../services/userService';
import { Button } from '../UIComponents';

interface LinkChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string;
    parentName: string;
    onSuccess: () => void;
}

export const LinkChildModal: React.FC<LinkChildModalProps> = ({ isOpen, onClose, parentId, parentName, onSuccess }) => {
    const [childName, setChildName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [results, setResults] = useState<any[]>([]);

    // Real-time search effect
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (childName.length >= 3 || (phone.replace(/\D/g, '').length >= 4)) {
                setIsSearching(true);
                setError('');
                setSuccessMsg('');
                try {
                    const found = await findChildToLink(childName, phone);
                    setResults(found);
                    if (found.length === 0) {
                        setError('Спортсмен не найден. Проверьте правильность ФИО или телефона.');
                    }
                } catch (err) {
                    setError('Ошибка при поиске.');
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults([]);
                setError('');
                setSuccessMsg('');
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [childName, phone]);

    const handleLink = async (candidate: any) => {
        if (!parentId) return;

        setIsLinking(true);
        setError('');
        setSuccessMsg('');

        try {
            if (candidate.type === 'user') {
                const res = await sendLinkingRequest(parentId, parentName, candidate.id);
                if (res.success) {
                    setSuccessMsg(`Запрос отправлен ${candidate.name}. Ребенку нужно подтвердить его в своем кабинете.`);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 3000);
                } else {
                    setError(res.message || 'Не удалось отправить запрос.');
                }
            } else {
                const result = await linkParentToRegistryChild(parentId, candidate.id, candidate.name);
                if (result.success) {
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#D4AF37', '#FFFFFF', '#000000']
                    });
                    onSuccess();
                    onClose();
                } else {
                    setError(result.error || 'Ошибка при привязке.');
                }
            }
        } catch (err: any) {
            setError('Ошибка при привязке.');
        } finally {
            setIsLinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                >
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Привязать ребенка</h3>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Поиск по реестру и базе</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={childName}
                                        onChange={(e) => setChildName(e.target.value)}
                                        placeholder="ФИО РЕБЕНКА"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder:text-white/20 outline-none focus:border-sparta-gold transition-all text-sm font-bold uppercase tracking-widest"
                                    />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="ТЕЛЕФОН РОДИТЕЛЯ"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder:text-white/20 outline-none focus:border-sparta-gold transition-all text-sm font-bold uppercase tracking-widest"
                                    />
                                </div>
                            </div>

                            {isSearching && (
                                <div className="flex items-center justify-center py-4 gap-3 text-sparta-gold/60">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Анализ данных...</span>
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Найдено соответствий: {results.length}</p>
                                    {results.map((candidate) => (
                                        <motion.div
                                            key={candidate.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-sparta-gold/50 transition-all cursor-pointer"
                                            onClick={() => handleLink(candidate)}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide">{candidate.name}</h4>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5">
                                                            {candidate.type === 'user' ? 'Активен' : 'В реестре'}
                                                        </span>
                                                        {candidate.age && (
                                                            <span className="text-[8px] font-black uppercase text-sparta-gold/60">{candidate.age} лет</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black transition-all">
                                                    {isLinking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs"
                                >
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p className="font-bold leading-relaxed">{error}</p>
                                </motion.div>
                            )}

                            {successMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-3 text-green-400 text-xs"
                                >
                                    <Check size={16} className="shrink-0 mt-0.5" />
                                    <p className="font-bold leading-relaxed">{successMsg}</p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};