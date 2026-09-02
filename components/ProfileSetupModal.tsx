import React from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from './ui/BaseModal';

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="text-white text-center">
                <div className="w-16 h-16 rounded-full bg-sparta-gold/20 flex items-center justify-center mx-auto mb-4 border border-sparta-gold/30">
                    <User size={32} className="text-sparta-gold" />
                </div>
                <h3 className="font-russo text-2xl mb-2 text-white">Заполнение профиля</h3>
                <p className="font-manrope text-white/60 text-sm mb-6">
                    Пожалуйста, перейдите в личный кабинет для завершения настройки профиля.
                </p>
                <button
                    onClick={() => {
                        onClose();
                        navigate('/dashboard');
                    }}
                    className="w-full py-3 bg-sparta-gold text-black font-bold rounded-xl hover:brightness-110 transition-all cursor-pointer"
                >
                    Перейти в кабинет
                </button>
            </div>
        </BaseModal>
    );
};

export default ProfileSetupModal;
