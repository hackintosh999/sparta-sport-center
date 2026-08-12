import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const LoadingScreen: React.FC = () => {
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // Smooth movement for the tilt
    const springConfig = { damping: 20, stiffness: 100 };
    const rotateX = useSpring(useTransform(mouseY, [0, 1], [20, -20]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [0, 1], [-20, 20]), springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        mouseX.set(x);
        mouseY.set(y);
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden px-6 cursor-none perspective-2000"
        >
            {/* Cinematic Particle Background with Z-depth */}
            <div className="absolute inset-0 pointer-events-none opacity-40 preserve-3d">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            opacity: 0,
                            scale: 0,
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            z: Math.random() * 200 - 100
                        }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            y: [null, '-=150'],
                            z: [null, '+=50']
                        }}
                        transition={{
                            duration: 4 + Math.random() * 6,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "easeInOut"
                        }}
                        style={{
                            rotateX,
                            rotateY,
                            transformStyle: 'preserve-3d'
                        }}
                        className="absolute w-1 h-1 bg-sparta-gold rounded-full blur-[1px]"
                    />
                ))}
            </div>

            {/* Dynamic Interactive Scene */}
            <motion.div
                style={{ rotateX, rotateY }}
                className="relative preserve-3d"
            >
                {/* 3D Depth Logo Structure */}
                <div className="relative w-56 h-56 md:w-96 md:h-96 preserve-3d">

                    {/* 1. Underlying Shadow Layer (Z: -50px) */}
                    <div className="absolute inset-0 translate-z-neg-50 flex items-center justify-center opacity-40 blur-2xl">
                        <img src="/sparta-logo.png" alt="" className="w-full h-full object-contain brightness-0" />
                    </div>

                    {/* 2. Main Glow Body */}
                    <motion.div
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-sparta-gold/20 rounded-full blur-[60px] translate-z-0"
                    />

                    {/* 3. High-Fidelity Logo Layer (Z: 50px) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="relative z-10 w-full h-full flex items-center justify-center translate-z-50 preserve-3d"
                    >
                        <img
                            src="/sparta-logo.png"
                            alt="Sparta Logo"
                            className="w-full h-full object-contain gold-glow-strong"
                        />

                        {/* 4. Glass Glaze Layer (Z: 80px) */}
                        <div className="absolute inset-8 rounded-full overflow-hidden pointer-events-none translate-z-100 mix-blend-overlay opacity-80">
                            <div className="shine-sweep" />
                            <div className="absolute inset-0 gold-glaze rounded-full" />
                        </div>
                    </motion.div>
                </div>

                {/* Brand Text with Depth Displacement */}
                <motion.div
                    initial={{ opacity: 0, y: 50, z: -100 }}
                    animate={{ opacity: 1, y: 0, z: 0 }}
                    transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                    className="mt-16 flex flex-col items-center gap-8 translate-z-100"
                >
                    <div className="flex flex-col items-center">
                        <h2 className="font-russo text-4xl md:text-6xl tracking-[0.4em] text-gold-gradient drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                            SPARTA
                        </h2>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "120%" }}
                            transition={{ delay: 1.5, duration: 1.5 }}
                            className="h-[3px] bg-gradient-to-r from-transparent via-sparta-gold to-transparent mt-3"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-64 h-[2px] bg-white/5 relative overflow-hidden rounded-full">
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-sparta-gold to-transparent shadow-[0_0_15px_#D4AF37]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-white/40 font-manrope text-[11px] uppercase font-bold tracking-[0.6em] animate-pulse">
                            Инициализация систем
                        </span>
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                                    className="w-1 h-1 bg-sparta-gold rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Ambient Lighting Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

            {/* Tech Frame Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 2 }}
                className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between"
            >
                <div className="flex justify-between">
                    <div className="w-12 h-12 border-t-2 border-l-2 border-sparta-gold/20 rounded-tl-3xl" />
                    <div className="w-12 h-12 border-t-2 border-r-2 border-sparta-gold/20 rounded-tr-3xl" />
                </div>
                <div className="flex justify-between">
                    <div className="w-12 h-12 border-b-2 border-l-2 border-sparta-gold/20 rounded-bl-3xl" />
                    <div className="w-12 h-12 border-b-2 border-r-2 border-sparta-gold/20 rounded-br-3xl" />
                </div>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;