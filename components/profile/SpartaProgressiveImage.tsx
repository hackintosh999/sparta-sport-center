import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SpartaProgressiveImageProps {
    src: string;
    alt?: string;
    className?: string;
    containerClassName?: string;
    onClick?: (e: React.MouseEvent) => void;
    isUploading?: boolean;
    uploadProgress?: number; // 0..100
    loading?: 'lazy' | 'eager';
}

export const SpartaProgressiveImage: React.FC<SpartaProgressiveImageProps> = ({
    src,
    alt = '',
    className = 'w-full h-full object-cover',
    containerClassName = '',
    onClick,
    isUploading = false,
    uploadProgress,
    loading = 'lazy'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden bg-neutral-900/90 select-none ${containerClassName}`}
        >
            {/* Background placeholder skeleton / pulse */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-neutral-900 to-black/80 animate-pulse" />
            )}

            {/* Actual Image with Blur-Up Transition */}
            {!hasError ? (
                <img
                    src={src}
                    alt={alt}
                    loading={loading}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                    className={`${className} transition-all duration-500 ease-out ${
                        isLoaded
                            ? 'opacity-100 blur-0 scale-100'
                            : 'opacity-25 blur-md scale-105'
                    }`}
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/40 text-white/30 text-[10px] font-mono">
                    <span>⚠️ Не удалось загрузить фото</span>
                </div>
            )}

            {/* Telegram / WhatsApp Style Circular Loader */}
            <AnimatePresence>
                {(!isLoaded && !hasError) || isUploading ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 backdrop-blur-[2px] pointer-events-none"
                    >
                        <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/70 backdrop-blur-md border border-sparta-gold/30 shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center ring-1 ring-white/10">
                            {typeof uploadProgress === 'number' && isUploading ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            className="text-white/15"
                                            strokeWidth="3"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="text-sparta-gold transition-all duration-300 stroke-current"
                                            strokeWidth="3"
                                            strokeDasharray={`${Math.max(5, uploadProgress)}, 100`}
                                            strokeLinecap="round"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <span className="absolute text-[9px] font-mono font-bold text-sparta-gold">
                                        {Math.round(uploadProgress)}%
                                    </span>
                                </div>
                            ) : (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-sparta-gold/20 border-t-sparta-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                                />
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};
