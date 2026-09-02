import React, { useState } from 'react';
import { X, Wallet, ArrowRight, Loader } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { BaseModal } from './ui/BaseModal';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, user }) => {
    const { userProfile } = useAuth();
    const [amount, setAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const minAmount = 1;

    const handleTopUp = async () => {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < minAmount) {
            setError(`Сумма пополнения должна быть больше 0 ₽`);
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Create pending order in Firestore
            const orderRef = await addDoc(collection(db, 'orders'), {
                userId: user.uid,
                email: user.email,
                type: 'topup',
                planId: 'wallet_topup',
                amount: numAmount,
                status: 'pending',
                date: new Date(),
                createdAt: new Date(),
                description: 'Пополнение баланса'
            });

            const currentBalance = userProfile?.walletBalance || 0;
            await updateDoc(doc(db, 'users', user.uid), {
                walletBalance: currentBalance + numAmount
            });
            await updateDoc(orderRef, {
                status: 'completed',
                paymentMethod: 'sbp'
            });
            setIsProcessing(false);
            onClose();
        } catch (err: any) {
            console.error('Top-up error:', err);
            setError(err.message || 'Произошла ошибка при пополнении баланса');
            setIsProcessing(false);
        }
    };

    const presetAmounts = [500, 1000, 3000, 5000];

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            showCloseButton={false}
            noPadding
            glowColor="amber"
        >
            <div className="relative w-full bg-[#1a1a1a] rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="relative p-6 border-b border-white/10 shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sparta-gold/10 flex items-center justify-center border border-sparta-gold/20">
                                <Wallet className="text-sparta-gold" size={20} />
                            </div>
                            <h2 className="text-2xl font-russo text-white">Пополнение</h2>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Закрыть"
                            className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                            disabled={isProcessing}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-6">
                        <label className="block text-white/60 text-sm font-bold uppercase tracking-wider mb-2">
                            Сумма пополнения (₽)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="0"
                                min={minAmount}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-2xl text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-sparta-gold/50 transition-colors"
                            />
                        </div>
                        {error && (
                            <p className="mt-2 text-red-500 text-sm">{error}</p>
                        )}
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-2 mb-8">
                        {presetAmounts.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setAmount(preset.toString())}
                                className={`py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                                    amount === preset.toString()
                                        ? 'bg-sparta-gold text-black border-sparta-gold'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/30'
                                }`}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    {/* Payment Notice */}
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-white/60">
                        <p>Средства будут зачислены на ваш внутренний баланс. Вы сможете использовать их для покупки абонементов и дополнительных услуг.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 shrink-0 bg-[#1a1a1a]">
                    <button
                        onClick={handleTopUp}
                        disabled={isProcessing || !amount || Number(amount) < minAmount}
                        className="w-full py-4 bg-sparta-gold hover:bg-yellow-500 text-black rounded-xl font-russo text-lg uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isProcessing ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Переход к оплате...
                            </>
                        ) : (
                            <>
                                <span>Пополнить на {amount || '0'} ₽</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default TopUpModal;
