import React, { useState, useEffect } from 'react';
import { Check, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { safeLocalStorage } from '../utils/storage';
import { BaseModal } from './ui/BaseModal';

interface TrialModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGroup?: { id: string; name: string } | null;
}

const TrialModal: React.FC<TrialModalProps> = ({ isOpen, onClose, selectedGroup }) => {
    const { user, userProfile, refreshTrialStatus } = useAuth();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [directions, setDirections] = useState<any[]>([]);
    const [searchSport, setSearchSport] = useState('');
    const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);

    const [formData, setFormData] = useState({
        childSurname: '',
        childName: '',
        childAge: '',
        parentName: '',
        parentPhone: '',
        email: '',
        sports: [] as string[],
        preferredDay: 'В субботу' as 'В субботу' | 'В воскресенье',
        comment: ''
    });

    useEffect(() => {
        if (!isOpen) return;

        // Fetch available sports from 'directions'
        const q = query(collection(db, "directions"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title
            }));
            setDirections(data);
        });

        // Pre-fill if user is logged in
        if (userProfile) {
            setFormData(prev => ({
                ...prev,
                childName: prev.childName || userProfile.childName || '',
                childSurname: prev.childSurname || userProfile.childLastName || '',
                childAge: prev.childAge || userProfile.childAge || '',
                parentName: prev.parentName || userProfile.parentName || userProfile.firstName || '',
                parentPhone: prev.parentPhone || userProfile.parentPhone || '',
                email: prev.email || userProfile.email || user?.email || ''
            }));
        }

        return () => unsubscribe();
    }, [isOpen, userProfile, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.childAge && parseInt(formData.childAge) > 14) {
            alert("К сожалению, наши программы рассчитаны на детей до 14 лет включительно.");
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "requests"), {
                ...formData,
                userId: user?.uid || null,
                createdAt: serverTimestamp(),
                status: 'new',
                programType: 'Пробная тренировка',
                groupId: selectedGroup?.id || null,
                groupTitle: selectedGroup?.name || null,
                history: [{
                    status: 'new',
                    timestamp: serverTimestamp(),
                    note: selectedGroup
                        ? `Заявка создана пользователем (Группа: ${selectedGroup.name})`
                        : 'Заявка создана пользователем'
                }]
            });
            console.log("Trial request submitted. ID:", docRef.id);
            const currentRequestedIds = JSON.parse(safeLocalStorage.getItem('trial_requested_ids') || '[]');
            if (selectedGroup && !currentRequestedIds.includes(selectedGroup.id)) {
                safeLocalStorage.setItem('trial_requested_ids', JSON.stringify([...currentRequestedIds, selectedGroup.id]));
            } else if (!selectedGroup) {
                safeLocalStorage.setItem('trial_requested_general', 'true');
            }

            if (refreshTrialStatus) await refreshTrialStatus();
            setIsSubmitted(true);
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Ошибка при отправке. Проверьте соединение.");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleSport = (sportTitle: string) => {
        setFormData(prev => {
            const isSelected = prev.sports.includes(sportTitle);
            if (isSelected) {
                return { ...prev, sports: prev.sports.filter(s => s !== sportTitle) };
            } else {
                return { ...prev, sports: [...prev.sports, sportTitle] };
            }
        });
    };

    const filteredSports = directions.filter(d =>
        d.title.toLowerCase().includes(searchSport.toLowerCase())
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="text-left font-manrope">
                {!isSubmitted ? (
                    <>
                        <h2 className="font-russo text-2xl text-white mb-2 text-center">
                            Пробное <span className="text-sparta-gold">занятие</span>
                        </h2>
                        <p className="text-white/50 text-center text-sm mb-6 font-manrope">
                            Пробные тренировки проходят <span className="text-white font-bold">только по выходным</span>. <br />
                            Оставьте заявку, и мы свяжемся с вами.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4 font-manrope">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Фамилия ребенка</label>
                                    <input
                                        type="text"
                                        name="childSurname"
                                        required
                                        value={formData.childSurname}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm"
                                        placeholder="Иванов"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Имя ребенка</label>
                                    <input
                                        type="text"
                                        name="childName"
                                        required
                                        value={formData.childName}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm"
                                        placeholder="Иван"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Возраст ребенка</label>
                                    <input
                                        type="number"
                                        name="childAge"
                                        required
                                        min="3"
                                        max="14"
                                        value={formData.childAge}
                                        onChange={handleChange}
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm ${parseInt(formData.childAge) > 14 ? 'border-red-500/50' : 'border-white/10'}`}
                                        placeholder="7"
                                    />
                                    {formData.childAge && parseInt(formData.childAge) > 14 && (
                                        <p className="text-red-400 text-[10px] mt-1 font-bold px-1">
                                            Максимальный возраст — 14 лет
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Телефон родителя</label>
                                    <input
                                        type="tel"
                                        name="parentPhone"
                                        required
                                        value={formData.parentPhone}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm"
                                        placeholder="+7 (999) 000-00-00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Виды спорта <span className="text-white/30 normal-case">(выберите один или несколько)</span></label>
                                <div className="relative">
                                    <div
                                        onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer hover:bg-white/10 transition-all flex items-center justify-between"
                                    >
                                        <span className={formData.sports.length > 0 ? 'text-white text-sm' : 'text-white/20 text-sm'}>
                                            {formData.sports.length > 0
                                                ? formData.sports.join(', ')
                                                : 'Выберите виды спорта'}
                                        </span>
                                        <ChevronDown size={16} className={`transition-transform duration-300 ${isSportDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    <AnimatePresence>
                                        {isSportDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-[#222] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                            >
                                                <div className="p-2 border-b border-white/5">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                                        <input
                                                            type="text"
                                                            value={searchSport}
                                                            onChange={(e) => setSearchSport(e.target.value)}
                                                            placeholder="Поиск спорта..."
                                                            className="w-full bg-white/5 border-none rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:bg-white/10"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                    {filteredSports.map((sport) => (
                                                        <div
                                                            key={sport.id}
                                                            onClick={() => toggleSport(sport.title)}
                                                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                                                        >
                                                            <span className="text-sm text-white/70 group-hover:text-white">{sport.title}</span>
                                                            {formData.sports.includes(sport.title) && <Check size={14} className="text-sparta-gold" />}
                                                        </div>
                                                    ))}
                                                    {filteredSports.length === 0 && (
                                                        <div className="py-4 text-center text-white/30 text-xs">Ничего не найдено</div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/70 mb-3 ml-1 uppercase tracking-wider">Когда вам удобнее прийти?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['В субботу', 'В воскресенье'].map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, preferredDay: day as any })}
                                            className={`py-3 rounded-xl border font-bold transition-all duration-300 text-sm cursor-pointer ${formData.preferredDay === day
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-lg shadow-sparta-gold/20'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">
                                    Комментарий <span className="text-white/30 normal-case">(опыт в спорте, пожелания)</span>
                                </label>
                                <textarea
                                    name="comment"
                                    value={formData.comment}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm resize-none"
                                    placeholder="Например: Сын занимался футболом 2 года..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Имя родителя</label>
                                    <input
                                        type="text"
                                        name="parentName"
                                        required
                                        value={formData.parentName}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm"
                                        placeholder="Алексей"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1 uppercase tracking-wider">Email <span className="text-white/30 normal-case font-normal">(необязательно)</span></label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-sm"
                                        placeholder="example@mail.ru"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-sparta-gold text-black font-bold py-4 rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-[1.01] active:scale-[0.99] mt-2 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                            >
                                Записаться на пробное
                            </button>
                        </form>

                        <p className="text-white/10 text-[9px] text-center mt-4 uppercase tracking-tighter">
                            Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных.
                        </p>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center py-8"
                    >
                        <div className="w-16 h-16 bg-sparta-gold/10 rounded-full flex items-center justify-center text-sparta-gold mb-4 border border-sparta-gold/20">
                            <Check size={32} />
                        </div>
                        <h3 className="font-russo text-2xl text-white mb-2">Заявка принята!</h3>
                        <p className="text-white/50 font-manrope">
                            Мы свяжемся с вами по номеру <br />
                            <span className="text-white">{formData.parentPhone}</span>
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-8 px-8 py-2 border border-white/10 rounded-full text-white/70 hover:text-white hover:border-white/30 transition-all text-sm cursor-pointer"
                        >
                            Закрыть
                        </button>
                    </motion.div>
                )}
            </div>
        </BaseModal>
    );
};

export default TrialModal;
