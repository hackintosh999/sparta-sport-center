import React, { useState, useEffect } from 'react';
import { User, Calendar, Activity, Hash, Phone, Loader2, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { BaseModal } from './ui/BaseModal';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: any;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, userData }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Initial state from userData
    const getInitialFullName = () => {
        if (!userData) return '';
        if (userData.childFirstName || userData.childLastName) {
            return `${userData.childFirstName || ''} ${userData.childLastName || ''}`.trim();
        }
        return userData.childName || userData.name || '';
    };

    const getInitialBirthDate = () => {
        if (!userData) return '';
        if (userData.birthDate) return userData.birthDate;
        if (userData.childBirthYear) return `${userData.childBirthYear}-01-01`;
        return '';
    };

    const [formData, setFormData] = useState({
        fullName: getInitialFullName(),
        birthDate: getInitialBirthDate(),
        footballPosition: userData?.footballPosition || userData?.position || 'Нападающий',
        jerseyNumber: userData?.jerseyNumber || '',
        phone: userData?.parentPhone || userData?.phone || ''
    });

    useEffect(() => {
        if (userData) {
            setFormData({
                fullName: getInitialFullName(),
                birthDate: getInitialBirthDate(),
                footballPosition: userData?.footballPosition || userData?.position || 'Нападающий',
                jerseyNumber: userData?.jerseyNumber || '',
                phone: userData?.parentPhone || userData?.phone || ''
            });
        }
    }, [userData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;

        setLoading(true);
        try {
            const nameParts = formData.fullName.trim().split(' ');
            const childFirstName = nameParts[0] || '';
            const childLastName = nameParts.slice(1).join(' ') || '';

            // Calculate age and birth year if date is provided
            let childAge = userData?.childAge || '';
            let childBirthYear = userData?.childBirthYear || '';
            if (formData.birthDate) {
                const bDate = new Date(formData.birthDate);
                if (!isNaN(bDate.getTime())) {
                    childBirthYear = bDate.getFullYear().toString();
                    const today = new Date();
                    let age = today.getFullYear() - bDate.getFullYear();
                    const m = today.getMonth() - bDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
                        age--;
                    }
                    childAge = Math.max(0, age).toString();
                }
            }

            const posVal = formData.footballPosition || 'Нападающий';

            const payload = {
                childName: formData.fullName.trim(),
                childFirstName,
                childLastName,
                name: formData.fullName.trim(),
                birthDate: formData.birthDate,
                childBirthYear,
                childAge,
                position: posVal,
                footballPosition: posVal,
                jerseyNumber: formData.jerseyNumber,
                parentPhone: formData.phone.trim(),
                phone: formData.phone.trim(),
                updatedAt: new Date()
            };

            await updateDoc(doc(db, "users", user.uid), payload);
            setLoading(false);
            onClose();
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-[120]"
        >
            <div className="text-left font-manrope">
                {/* Header */}
                <div className="pb-6 border-b border-white/10 pr-10">
                    <h2 className="text-2xl font-russo text-white uppercase tracking-wider">Редактирование профиля</h2>
                    <p className="text-xs text-white/50 font-manrope mt-1">Заполните личные данные атлета</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-5 font-manrope">
                    {/* 1. ФИО */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-2">
                            <User size={14} className="text-sparta-gold" />
                            ФИО
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Иванов Иван Петрович"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors placeholder:text-white/20 font-medium"
                        />
                    </div>

                    {/* 2. Дата рождения */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-2">
                            <Calendar size={14} className="text-sparta-gold" />
                            Дата рождения
                        </label>
                        <input
                            type="date"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors color-scheme-dark font-medium [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>

                    {/* 3. Позиция на поле */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-2">
                            <Activity size={14} className="text-sparta-gold" />
                            Позиция на поле
                        </label>
                        <select
                            value={formData.footballPosition}
                            onChange={e => setFormData({ ...formData, footballPosition: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors font-medium [&>option]:bg-[#15171C] [&>option]:text-white"
                        >
                            <option value="Вратарь">Вратарь</option>
                            <option value="Защитник">Защитник</option>
                            <option value="Полузащитник">Полузащитник</option>
                            <option value="Нападающий">Нападающий</option>
                        </select>
                    </div>

                    {/* 4. Игровой номер */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-2">
                            <Hash size={14} className="text-sparta-gold" />
                            Игровой номер
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.jerseyNumber}
                            onChange={e => setFormData({ ...formData, jerseyNumber: e.target.value })}
                            placeholder="1-99"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors placeholder:text-white/20 font-medium"
                        />
                    </div>

                    {/* 5. Телефон */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-2">
                            <Phone size={14} className="text-sparta-gold" />
                            Телефон
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+7 (999) 000-00-00"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors placeholder:text-white/20 font-medium"
                        />
                    </div>

                    {/* Footer Submit Button */}
                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-sparta-gold hover:bg-yellow-400 text-black font-russo rounded-xl transition-all shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 uppercase tracking-wider text-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Сохранить изменения</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </BaseModal>
    );
};

export default EditProfileModal;
