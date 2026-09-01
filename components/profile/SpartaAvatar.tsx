import React, { useState } from 'react';
import { Crown, Users, User, Shield } from 'lucide-react';

interface SpartaAvatarProps {
    src?: string | null;
    name?: string;
    role?: string;
    isGroup?: boolean;
    isCoach?: boolean;
    isAdmin?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
}

const GRADIENTS = [
    'from-amber-600 to-yellow-800 text-white',
    'from-blue-600 to-indigo-800 text-white',
    'from-emerald-600 to-teal-800 text-white',
    'from-purple-600 to-pink-800 text-white',
    'from-rose-600 to-red-800 text-white',
    'from-cyan-600 to-blue-800 text-white'
];

const getGradientForName = (name: string = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % GRADIENTS.length;
    return GRADIENTS[idx];
};

export const SpartaAvatar: React.FC<SpartaAvatarProps> = ({
    src,
    name = '',
    role = '',
    isGroup = false,
    isCoach = false,
    isAdmin = false,
    size = 'md',
    className = '',
    onClick
}) => {
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    }[size];

    const iconSizes = {
        xs: 12,
        sm: 15,
        md: 18,
        lg: 22
    }[size];

    const isSystemAdmin = isAdmin || role === 'admin' || role === 'director' || name.toLowerCase().includes('администрация');
    const isTrainer = isCoach || role === 'coach' || role === 'trainer';

    // 1. Administration / System Avatar
    if (isSystemAdmin) {
        return (
            <div
                onClick={onClick}
                className={`${sizeClasses} rounded-full bg-gradient-to-br from-sparta-gold via-yellow-500 to-amber-600 text-black font-black flex items-center justify-center shadow-md shadow-sparta-gold/20 border-2 border-sparta-gold shrink-0 select-none ${className}`}
                title={name || 'Администрация Спарта'}
            >
                <span>⚽</span>
            </div>
        );
    }

    // 2. Training Group Avatar
    if (isGroup) {
        return (
            <div
                onClick={onClick}
                className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-900/40 border border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center shadow-sm shrink-0 select-none ${className}`}
                title={name || 'Группа Спарта'}
            >
                <Users size={iconSizes} />
            </div>
        );
    }

    // 3. User or Coach with valid image
    if (src && !imgError) {
        return (
            <div
                onClick={onClick}
                className={`${sizeClasses} rounded-full overflow-hidden border border-white/15 bg-black/40 shrink-0 ${className}`}
            >
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    // 4. Coach fallback (Crown)
    if (isTrainer) {
        return (
            <div
                onClick={onClick}
                className={`${sizeClasses} rounded-full bg-gradient-to-br from-sparta-gold/20 via-yellow-600/20 to-black border border-sparta-gold/50 text-sparta-gold font-bold flex items-center justify-center shrink-0 select-none ${className}`}
                title={name || 'Тренер Спарта'}
            >
                <Crown size={iconSizes} />
            </div>
        );
    }

    // 5. User Initial Fallback with dynamic colored gradient
    const initial = (name.trim().charAt(0) || 'С').toUpperCase();
    const gradientClass = getGradientForName(name);

    return (
        <div
            onClick={onClick}
            className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradientClass} font-bold font-russo flex items-center justify-center border border-white/20 shadow-sm shrink-0 select-none ${className}`}
            title={name}
        >
            <span>{initial}</span>
        </div>
    );
};
