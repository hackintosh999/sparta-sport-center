import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88, rotate: isDark ? 15 : -15 }}
            onClick={toggleTheme}
            className={`
                relative h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center 
                rounded-2xl border-2 transition-all duration-700 overflow-hidden
                ${isDark
                    ? 'bg-[#0c0c0c] border-sparta-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                    : 'bg-white/80 border-amber-300/40 shadow-[0_0_24px_rgba(255,200,50,0.2)]'
                }
                hover:border-sparta-gold/60 group backdrop-blur-sm
                ${className}
            `}
            aria-label="Переключить тему"
        >
            {/* Animated background glow */}
            <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                    background: isDark
                        ? 'radial-gradient(circle at 60% 30%, rgba(100, 120, 200, 0.15), transparent 70%)'
                        : 'radial-gradient(circle at 40% 40%, rgba(255, 200, 50, 0.2), transparent 70%)'
                }}
                transition={{ duration: 0.8 }}
            />

            {/* Stars (visible in dark mode) */}
            <AnimatePresence>
                {isDark && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="absolute top-2 right-2.5 w-1 h-1 bg-white/70 rounded-full"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ delay: 0.35, duration: 0.4 }}
                            className="absolute top-3.5 right-1.5 w-0.5 h-0.5 bg-white/50 rounded-full"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 0.8, 0.4, 1], scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="absolute bottom-2.5 left-2 w-0.5 h-0.5 bg-white/40 rounded-full"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Sun rays (visible in light mode) */}
            <AnimatePresence>
                {!isDark && (
                    <motion.div
                        initial={{ opacity: 0, rotate: 0 }}
                        animate={{ opacity: 1, rotate: 360 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-[2px] h-1.5 bg-amber-400/30 rounded-full"
                                style={{
                                    transform: `rotate(${i * 45}deg) translateY(-16px)`,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.2, 0.6, 0.2] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main icon with swap animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{
                        y: isDark ? 30 : -30,
                        opacity: 0,
                        rotate: isDark ? -90 : 90,
                        scale: 0.3
                    }}
                    animate={{
                        y: 0,
                        opacity: 1,
                        rotate: 0,
                        scale: 1
                    }}
                    exit={{
                        y: isDark ? -30 : 30,
                        opacity: 0,
                        rotate: isDark ? 90 : -90,
                        scale: 0.3
                    }}
                    transition={{
                        duration: 0.5,
                        ease: [0.34, 1.56, 0.64, 1] // spring-like bounce
                    }}
                    className="relative z-10"
                >
                    {isDark ? (
                        /* Moon icon */
                        <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6 sm:w-7 sm:h-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <motion.path
                                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                className="text-sparta-gold"
                                fill="rgba(212, 175, 55, 0.15)"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </svg>
                    ) : (
                        /* Sun icon */
                        <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6 sm:w-7 sm:h-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        >
                            <motion.circle
                                cx="12" cy="12" r="5"
                                className="text-amber-500"
                                fill="rgba(245, 180, 30, 0.25)"
                                initial={{ r: 0 }}
                                animate={{ r: 5 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                            {/* Sun rays */}
                            {[
                                "M12 1v2", "M12 21v2",
                                "M4.22 4.22l1.42 1.42", "M18.36 18.36l1.42 1.42",
                                "M1 12h2", "M21 12h2",
                                "M4.22 19.78l1.42-1.42", "M18.36 5.64l1.42-1.42"
                            ].map((d, i) => (
                                <motion.path
                                    key={i}
                                    d={d}
                                    className="text-amber-500"
                                    initial={{ opacity: 0, pathLength: 0 }}
                                    animate={{ opacity: 1, pathLength: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                                />
                            ))}
                        </svg>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Pulse ring on hover */}
            <motion.div
                className={`absolute inset-0 rounded-2xl border-2 pointer-events-none ${isDark ? 'border-sparta-gold/20' : 'border-amber-300/20'
                    }`}
                initial={{ scale: 1, opacity: 0 }}
                whileHover={{ scale: 1.15, opacity: 1 }}
                transition={{ duration: 0.3 }}
            />
        </motion.button>
    );
};