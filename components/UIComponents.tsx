import React from 'react';
import { motion } from 'framer-motion';

// --- Gold Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'outline';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "rounded-full font-manrope font-bold transition duration-150 active:scale-95 active:duration-75 cursor-pointer select-none flex items-center justify-center px-8 py-4 tracking-wide";

    const variants = {
        primary: "bg-gold-gradient text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-105",
        outline: "border border-white/20 text-white hover:bg-white/10 hover:border-sparta-gold/50 hover:text-sparta-gold backdrop-blur-md"
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

// --- Glass Card ---
interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const GlassCard: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <motion.div
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={`rounded-[24px] md:rounded-[32px] bg-glass-dark border border-white/10 backdrop-blur-xl p-5 md:p-8 overflow-hidden relative group ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-sparta-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};



// --- Section Header ---
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    align?: 'center' | 'left';
    showDot?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, align = 'center', showDot = false }) => {
    return (
        <div className={`mb-10 md:mb-16 ${align === 'center' ? 'text-center' : 'text-left'}`}>
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-russo text-3xl md:text-5xl lg:text-6xl text-white mb-4 uppercase tracking-wider leading-tight"
            >
                {title} {showDot && <span className="text-sparta-gold">.</span>}
            </motion.h2>
            {subtitle && (
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                    className="text-gray-300 font-manrope text-base md:text-lg max-w-2xl mx-auto px-4 md:px-0 mt-2"
                >
                    {subtitle}
                </motion.p>
            )}
        </div>
    );
};

export const Container: React.FC<{ children: React.ReactNode; className?: string; fluid?: boolean }> = ({ children, className = '', fluid = true }) => {
    return <div className={`${fluid ? 'max-w-none w-full px-2 sm:px-4 md:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-16 2xl:px-24'} transition-all duration-500 ${className}`}>{children}</div>;
};