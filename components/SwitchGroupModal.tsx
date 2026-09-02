import React, { useState } from 'react';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Group } from '../types/shop';
import { BaseModal } from './ui/BaseModal';

interface SwitchGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetGroup: Group | null;
    onSuccess?: () => void;
}

export const SwitchGroupModal: React.FC<SwitchGroupModalProps> = ({
    isOpen,
    onClose,
    targetGroup,
    onSuccess
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!targetGroup) return null;

    const handleConfirmSwitch = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                groupId: targetGroup.id,
                updatedAt: new Date().toISOString()
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error switching group:", err);
            setError("Не удалось перевестись в группу. Попробуйте снова.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            showCloseButton={true}
            glowColor="amber"
        >
            <div className="flex flex-col items-center text-center pt-2">
                <div className="w-16 h-16 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center text-sparta-gold mb-6 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                    <ArrowRightLeft size={30} />
                </div>

                <h3 className="font-russo text-2xl text-white mb-3">
                    Перевод в новую группу
                </h3>

                <p className="font-manrope text-white/70 text-sm md:text-base leading-relaxed mb-6">
                    Вы уже состоите в другой группе. Вы уверены, что хотите перевестись в группу{' '}
                    <strong className="text-sparta-gold">{targetGroup.name}</strong>?
                </p>

                {error && (
                    <div className="w-full mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10 transition-all text-sm cursor-pointer"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirmSwitch}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold bg-sparta-gold text-black hover:bg-yellow-500 transition-all text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? 'Перевод...' : 'Подтвердить перевод'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default SwitchGroupModal;
