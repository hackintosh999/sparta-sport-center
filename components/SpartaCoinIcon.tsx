import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface SpartaCoinIconProps {
    size?: number | string;
    className?: string;
    animate?: boolean;
    showGlow?: boolean;
    alt?: string;
}

export const SpartaCoinIcon: React.FC<SpartaCoinIconProps> = ({
    size = 20,
    className = '',
    animate = true,
    showGlow = false,
    alt = 'Спарта Монета'
}) => {
    const [imgSrc, setImgSrc] = useState<string>('/images/sparta-coin.png');
    const [hasError, setHasError] = useState<boolean>(false);

    // Compute pixel or tailwind sizing
    const isNum = typeof size === 'number';
    const dimStyle = isNum ? { width: size, height: size } : {};
    const sizeClasses = !isNum ? size : '';

    const handleImgError = () => {
        if (imgSrc === '/images/sparta-coin.png') {
            // Fallback to banner-assets
            setImgSrc('/banner-assets/sparta-icon-coin-trimmed.png');
        } else if (imgSrc === '/banner-assets/sparta-icon-coin-trimmed.png') {
            setImgSrc('/banner-assets/icon_coin_3d.png');
        } else {
            setHasError(true);
        }
    };

    if (hasError) {
        // High quality SVG 3D Golden Coin Fallback
        return (
            <svg
                width={isNum ? size : 20}
                height={isNum ? size : 20}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`inline-block shrink-0 ${animate ? 'hover:scale-110 hover:rotate-6 transition-transform duration-300' : ''} ${className}`}
            >
                <circle cx="12" cy="12" r="10" fill="url(#spartaCoinFallbackGrad)" stroke="#FFE57F" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="7.5" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 1" />
                <path d="M12 6L16 16H13.5L12 11.5L10.5 16H8L12 6Z" fill="#78350F" />
                <defs>
                    <linearGradient id="spartaCoinFallbackGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFF2A3" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                </defs>
            </svg>
        );
    }

    return (
        <span
            className={`relative inline-flex items-center justify-center shrink-0 select-none align-middle ${className}`}
            style={dimStyle}
        >
            {showGlow && (
                <span
                    className="absolute inset-0 rounded-full bg-amber-400/30 blur-[6px] pointer-events-none animate-pulse"
                />
            )}
            <motion.img
                src={imgSrc}
                alt={alt}
                onError={handleImgError}
                style={dimStyle}
                className={`object-contain drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)] ${sizeClasses} ${
                    animate
                        ? 'transition-transform duration-300 ease-out hover:scale-115 hover:rotate-6 active:scale-95 cursor-pointer'
                        : ''
                }`}
                whileHover={animate ? { scale: 1.15, rotate: 6 } : undefined}
                whileTap={animate ? { scale: 0.92 } : undefined}
            />
        </span>
    );
};

export default SpartaCoinIcon;
