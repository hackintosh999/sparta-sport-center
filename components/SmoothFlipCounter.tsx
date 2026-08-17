import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmoothFlipCounterProps {
    value: number | string;
    label?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    highlight?: boolean;
}

export const SmoothFlipCounter: React.FC<SmoothFlipCounterProps> = ({
    value,
    label,
    size = 'lg',
    highlight = false
}) => {
    const formatted = typeof value === 'number' ? String(value).padStart(2, '0') : value;

    const sizeClasses = {
        sm: 'text-xl sm:text-2xl h-10 sm:h-12 min-w-[36px]',
        md: 'text-2xl sm:text-3xl h-12 sm:h-14 min-w-[44px]',
        lg: 'text-3xl sm:text-5xl h-14 sm:h-20 min-w-[56px]',
        xl: 'text-4xl sm:text-6xl h-16 sm:h-24 min-w-[68px]'
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative px-3 sm:px-4 rounded-2xl bg-white/[0.05] border ${highlight ? 'border-sparta-gold/50 shadow-[0_0_30px_rgba(255,191,0,0.2)]' : 'border-white/10'} flex items-center justify-center overflow-hidden ${sizeClasses[size]}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={formatted}
                        initial={{ y: 24, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -24, opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={`font-russo tracking-wider ${highlight ? 'text-sparta-gold' : 'text-white'}`}
                    >
                        {formatted}
                    </motion.span>
                </AnimatePresence>
            </div>
            {label && (
                <span className="text-[9px] sm:text-[10px] font-bold text-white/40 tracking-widest mt-1.5 uppercase">
                    {label}
                </span>
            )}
        </div>
    );
};
