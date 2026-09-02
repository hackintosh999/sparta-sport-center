import React from 'react';
import { Gift } from 'lucide-react';
import { BaseModal } from '../ui/BaseModal';

interface BonusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BonusModal: React.FC<BonusModalProps> = ({ isOpen, onClose }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            glowColor="purple"
        >
            <div className="text-white text-center pt-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(147,51,234,0.3)]">
                    <Gift size={32} className="text-white" />
                </div>
                <h3 className="font-russo text-2xl mb-2 text-gold-gradient">Бонусы и Рулетка</h3>
                <p className="font-manrope text-white/60 text-sm mb-6">
                    Вращайте колесо фортуны и получайте скидки на абонементы и подарки от SPARTA!
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-sparta-gold text-black font-bold rounded-xl hover:brightness-110 transition-all cursor-pointer"
                >
                    Закрыть
                </button>
            </div>
        </BaseModal>
    );
};

export default BonusModal;
