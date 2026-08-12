import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Gift } from 'lucide-react';

interface BonusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BonusModal: React.FC<BonusModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 text-white text-center shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Gift size={32} className="text-white" />
                    </div>
                    <h3 className="font-russo text-2xl mb-2 text-gold-gradient">Бонусы и Рулетка</h3>
                    <p className="font-manrope text-white/60 text-sm mb-6">
                        Вращайте колесо фортуны и получайте скидки на абонементы и подарки от SPARTA!
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-sparta-gold text-black font-bold rounded-xl hover:brightness-110 transition-all"
                    >
                        Закрыть
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BonusModal;
