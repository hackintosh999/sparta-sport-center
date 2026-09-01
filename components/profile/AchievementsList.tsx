import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    Trophy, Calendar, X, Box, CheckCircle2, Star, Lock, Sparkles,
    Shield, Award, Flame, Zap, Crown, Share2, Download, Printer,
    RotateCcw, Eye, Compass, ChevronRight, Check, Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAchievement, AchievementDefinition } from '../../types/shop';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

const Viewer3D = lazyWithRetry(() => import('../Viewer3D'));

interface AchievementsListProps {
    userAchievements?: UserAchievement[];
    showAllDefinitions?: boolean;
    userName?: string;
}

// =========================================================================
// 🎵 TRIUMPH CHIME AUDIO SYNTHESIZER (Web Audio API)
// =========================================================================
function playTriumphSound() {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);

            gain.gain.setValueAtTime(0, now + i * 0.07);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.07 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 1.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 1.4);
        });
    } catch (e) {}
}

// =========================================================================
// 🏆 REALISTIC VECTOR TROPHY RENDERS
// =========================================================================

// 1. Realistic Grand Gold Cup
const RealisticGrandGoldCup: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <linearGradient id="cupGoldBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF3A8" />
                <stop offset="25%" stopColor="#E5B232" />
                <stop offset="50%" stopColor="#8A5A00" />
                <stop offset="75%" stopColor="#F5D061" />
                <stop offset="100%" stopColor="#C48E12" />
            </linearGradient>
            <linearGradient id="cupDarkGold" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#4A2E00" />
                <stop offset="100%" stopColor="#B37D0E" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="45" ry="7" fill="black" opacity="0.6" />
        <path d="M 52 48 C 22 48 20 85 54 92 C 48 84 46 58 58 56 Z" fill="url(#cupGoldBody)" stroke="#6B4500" strokeWidth="1.5" />
        <path d="M 108 48 C 138 48 140 85 106 92 C 112 84 114 58 102 56 Z" fill="url(#cupGoldBody)" stroke="#6B4500" strokeWidth="1.5" />
        <path d="M 50 36 L 110 36 C 110 36 112 78 80 98 C 48 78 50 36 50 36 Z" fill="url(#cupGoldBody)" />
        <ellipse cx="80" cy="36" rx="30" ry="6" fill="#FFF3A8" stroke="#8A5A00" strokeWidth="1.5" />
        <ellipse cx="80" cy="36" rx="26" ry="4" fill="#6B4500" />
        <path d="M 74 96 L 86 96 L 84 116 L 76 116 Z" fill="url(#cupDarkGold)" stroke="#6B4500" strokeWidth="1" />
        <rect x="71" y="104" width="18" height="4" rx="2" fill="url(#cupGoldBody)" stroke="#6B4500" strokeWidth="1" />
        <path d="M 64 122 L 96 122 L 102 136 L 58 136 Z" fill="url(#cupGoldBody)" stroke="#6B4500" strokeWidth="1.5" />
        <rect x="54" y="136" width="52" height="6" rx="2" fill="url(#cupDarkGold)" />
        <circle cx="80" cy="62" r="13" fill="#3D2600" stroke="#FFF3A8" strokeWidth="1.5" />
        <path d="M 80 53 L 83 60 L 90 60 L 84 64 L 86 71 L 80 67 L 74 71 L 76 64 L 70 60 L 77 60 Z" fill="#FFD700" />
        <path d="M 55 40 Q 60 70 76 88 Q 72 70 70 40 Z" fill="white" opacity="0.4" />
        <circle cx="102" cy="44" r="2.5" fill="white" opacity="0.8" />
        <circle cx="62" cy="60" r="1.5" fill="white" opacity="0.8" />
    </svg>
);

// 2. Realistic Spartan Shield of Honor
const RealisticSpartanShield: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <radialGradient id="shieldBronze" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#D4A747" />
                <stop offset="40%" stopColor="#96691E" />
                <stop offset="70%" stopColor="#4A3108" />
                <stop offset="100%" stopColor="#241602" />
            </radialGradient>
            <linearGradient id="shieldGoldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEAA7" />
                <stop offset="50%" stopColor="#C49120" />
                <stop offset="100%" stopColor="#694600" />
            </linearGradient>
            <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="50%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="40" ry="6" fill="black" opacity="0.6" />
        <g transform="rotate(45 80 80)">
            <rect x="78" y="20" width="4" height="120" rx="2" fill="url(#swordBlade)" />
            <rect x="70" y="32" width="20" height="4" rx="2" fill="#D4AF37" />
            <circle cx="80" cy="22" r="4" fill="#D4AF37" />
        </g>
        <g transform="rotate(-45 80 80)">
            <rect x="78" y="20" width="4" height="120" rx="2" fill="url(#swordBlade)" />
            <rect x="70" y="32" width="20" height="4" rx="2" fill="#D4AF37" />
            <circle cx="80" cy="22" r="4" fill="#D4AF37" />
        </g>
        <circle cx="80" cy="80" r="50" fill="url(#shieldGoldRim)" stroke="#3D2600" strokeWidth="2" />
        <circle cx="80" cy="80" r="44" fill="url(#shieldBronze)" stroke="#FFD700" strokeWidth="1" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const rx = 80 + 47 * Math.cos(rad);
            const ry = 80 + 47 * Math.sin(rad);
            return <circle key={i} cx={rx} cy={ry} r="2" fill="#FFEAA7" stroke="#694600" strokeWidth="0.5" />;
        })}
        <path d="M 80 50 L 98 88 L 90 90 L 80 66 L 70 90 L 62 88 Z" fill="#FFD700" stroke="#694600" strokeWidth="1.5" />
        <path d="M 64 102 C 72 110 88 110 96 102" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 45 60 C 55 45 75 40 95 45 C 75 52 58 65 45 60 Z" fill="white" opacity="0.35" />
    </svg>
);

// 3. Realistic Champion Medal
const RealisticChampionMedal: React.FC<{ size?: number; isUnlocked?: boolean; rarity?: string }> = ({ size = 120, isUnlocked = true, rarity = 'rare' }) => {
    const isGold = rarity === 'legendary';
    const isSilver = rarity === 'rare';
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
        >
            <defs>
                <linearGradient id="ribbonLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1E1E24" />
                    <stop offset="35%" stopColor="#D4AF37" />
                    <stop offset="70%" stopColor="#1E1E24" />
                    <stop offset="100%" stopColor="#B37D0E" />
                </linearGradient>
                <linearGradient id="ribbonRight" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E1E24" />
                    <stop offset="35%" stopColor="#D4AF37" />
                    <stop offset="70%" stopColor="#1E1E24" />
                    <stop offset="100%" stopColor="#B37D0E" />
                </linearGradient>
                <radialGradient id="medalMetal" cx="40%" cy="35%" r="65%">
                    <stop offset="0%" stopColor={isGold ? "#FFF4B8" : isSilver ? "#F1F5F9" : "#E2BA86"} />
                    <stop offset="45%" stopColor={isGold ? "#E5B232" : isSilver ? "#94A3B8" : "#9C632C"} />
                    <stop offset="100%" stopColor={isGold ? "#6B4500" : isSilver ? "#334155" : "#452408"} />
                </radialGradient>
            </defs>
            <ellipse cx="80" cy="148" rx="35" ry="6" fill="black" opacity="0.6" />
            <path d="M 60 10 L 76 72 L 62 74 L 40 10 Z" fill="url(#ribbonLeft)" />
            <path d="M 100 10 L 84 72 L 98 74 L 120 10 Z" fill="url(#ribbonRight)" />
            <ellipse cx="80" cy="74" rx="8" ry="4" fill="#D4AF37" stroke="#6B4500" strokeWidth="1" />
            <circle cx="80" cy="106" r="34" fill="url(#medalMetal)" stroke="#D4AF37" strokeWidth="2.5" />
            <circle cx="80" cy="106" r="28" fill="none" stroke={isGold ? "#FFEAA7" : "#E2E8F0"} strokeWidth="1" strokeDasharray="3 2" />
            <path
                d="M 80 91 L 84 99 L 93 100 L 87 106 L 89 115 L 80 110 L 71 115 L 73 106 L 67 100 L 76 99 Z"
                fill={isGold ? "#FFEAA7" : isSilver ? "#FFFFFF" : "#FEEBC8"}
                stroke={isGold ? "#8A5A00" : "#475569"}
                strokeWidth="1"
            />
            <circle cx="80" cy="106" r="4" fill="#D4AF37" />
            <path d="M 58 92 Q 80 82 102 92 Q 80 86 58 92 Z" fill="white" opacity="0.4" />
        </svg>
    );
};

// 4. Realistic Diamond Crystal Trophy
const RealisticCrystalTrophy: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <linearGradient id="crystalFacet1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="crystalFacet2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="crystalFacet3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0369A1" stopOpacity="0.9" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="42" ry="6" fill="black" opacity="0.6" />
        <polygon points="50,45 110,45 130,70 80,125 30,70" fill="url(#crystalFacet1)" stroke="#BAE6FD" strokeWidth="1" />
        <polygon points="50,45 80,45 80,125 30,70" fill="url(#crystalFacet2)" />
        <polygon points="80,45 110,45 130,70 80,125" fill="url(#crystalFacet3)" />
        <polygon points="50,45 110,45 80,70" fill="#F0F9FF" fillOpacity="0.7" />
        <polygon points="50,45 30,70 80,70" fill="#7DD3FC" fillOpacity="0.5" />
        <polygon points="110,45 130,70 80,70" fill="#38BDF8" fillOpacity="0.5" />
        <polygon points="55,130 105,130 115,145 45,145" fill="#18181B" stroke="#D4AF37" strokeWidth="1.5" />
        <rect x="52" y="142" width="56" height="4" fill="#D4AF37" rx="1" />
        <path d="M 82 58 L 74 76 L 82 76 L 76 96 L 88 74 L 80 74 Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" />
        <circle cx="50" cy="45" r="3" fill="white" />
        <circle cx="120" cy="65" r="2" fill="white" />
        <circle cx="80" cy="125" r="3" fill="white" />
    </svg>
);

// 5. Realistic Golden Ball Trophy
const RealisticGoldenBall: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <radialGradient id="goldBallGrad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFF9D2" />
                <stop offset="35%" stopColor="#E5B232" />
                <stop offset="75%" stopColor="#96691E" />
                <stop offset="100%" stopColor="#3D2600" />
            </radialGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="42" ry="6" fill="black" opacity="0.6" />
        {/* Ball Pedestal */}
        <path d="M 60 120 L 100 120 L 110 144 L 50 144 Z" fill="#1A1A1E" stroke="#D4AF37" strokeWidth="1.5" />
        <rect x="48" y="140" width="64" height="4" fill="#D4AF37" rx="1" />
        {/* Ball Sphere */}
        <circle cx="80" cy="72" r="42" fill="url(#goldBallGrad)" stroke="#694600" strokeWidth="1.5" />
        {/* Pentagons */}
        <polygon points="80,55 94,65 89,80 71,80 66,65" fill="#3D2600" stroke="#FFD700" strokeWidth="1" />
        <polygon points="80,30 89,37 84,46 76,46 71,37" fill="#694600" stroke="#FFD700" strokeWidth="0.8" />
        <polygon points="112,65 120,74 116,84 106,82 104,72" fill="#694600" stroke="#FFD700" strokeWidth="0.8" />
        <polygon points="48,65 56,72 54,82 44,84 40,74" fill="#694600" stroke="#FFD700" strokeWidth="0.8" />
        {/* Specular Highlight */}
        <ellipse cx="64" cy="52" rx="12" ry="6" fill="white" opacity="0.4" transform="rotate(-25 64 52)" />
    </svg>
);

// 6. Realistic Captain Crown
const RealisticCaptainCrown: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF4B8" />
                <stop offset="35%" stopColor="#E5B232" />
                <stop offset="70%" stopColor="#8A5A00" />
                <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="42" ry="6" fill="black" opacity="0.6" />
        {/* Crown Cushion & Stand */}
        <polygon points="52,126 108,126 116,144 44,144" fill="#2A1015" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M 40 120 Q 80 130 120 120 Q 80 114 40 120 Z" fill="#881337" stroke="#D4AF37" strokeWidth="1" />
        {/* Crown Peaks */}
        <path d="M 38 116 L 34 56 L 58 84 L 80 42 L 102 84 L 126 56 L 122 116 Z" fill="url(#crownGold)" stroke="#694600" strokeWidth="1.5" />
        <circle cx="34" cy="54" r="5" fill="#EF4444" stroke="#FFEAA7" strokeWidth="1" />
        <circle cx="80" cy="40" r="7" fill="#3B82F6" stroke="#FFEAA7" strokeWidth="1.5" />
        <circle cx="126" cy="54" r="5" fill="#10B981" stroke="#FFEAA7" strokeWidth="1" />
        <rect x="42" y="106" width="76" height="8" rx="2" fill="#D4AF37" stroke="#694600" strokeWidth="1" />
    </svg>
);

// 7. Realistic Hero Star
const RealisticHeroStar: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <radialGradient id="starGold" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="80%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#451A03" />
            </radialGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="40" ry="6" fill="black" opacity="0.6" />
        <polygon points="56,128 104,128 112,144 48,144" fill="#18181B" stroke="#D4AF37" strokeWidth="1.5" />
        {/* 3D Star Facets */}
        <polygon points="80,30 94,68 135,70 102,96 114,136 80,112 46,136 58,96 25,70 66,68" fill="url(#starGold)" stroke="#78350F" strokeWidth="1.5" />
        <polygon points="80,30 80,112 114,136 102,96 135,70 94,68" fill="#FDE68A" fillOpacity="0.4" />
        <circle cx="80" cy="84" r="12" fill="#78350F" stroke="#FDE68A" strokeWidth="1.5" />
        <circle cx="80" cy="84" r="6" fill="#F59E0B" />
        <path d="M 68 55 L 80 40 L 85 55 Z" fill="white" opacity="0.6" />
    </svg>
);

// 8. Realistic Spartan Parchment Scroll (Свиток & Грамота)
const RealisticSpartanScroll: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <linearGradient id="parchmentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#FEF3C7" />
                <stop offset="70%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="scrollRollGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#78350F" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="waxSealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="60%" stopColor="#B91C1C" />
                <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="42" ry="6" fill="black" opacity="0.6" />
        {/* Wooden Pedestal */}
        <polygon points="50,132 110,132 118,146 42,146" fill="#1C1917" stroke="#D4AF37" strokeWidth="1.5" />
        {/* Main Parchment Body */}
        <path d="M 46 36 Q 80 42 114 36 L 114 116 Q 80 122 46 116 Z" fill="url(#parchmentGrad)" stroke="#B45309" strokeWidth="1.5" />
        {/* Top Roll Rod */}
        <rect x="36" y="30" width="88" height="10" rx="4" fill="url(#scrollRollGrad)" stroke="#451A03" strokeWidth="1" />
        <circle cx="36" cy="35" r="5" fill="#D4AF37" stroke="#451A03" strokeWidth="1" />
        <circle cx="124" cy="35" r="5" fill="#D4AF37" stroke="#451A03" strokeWidth="1" />
        {/* Bottom Roll Rod */}
        <rect x="36" y="114" width="88" height="10" rx="4" fill="url(#scrollRollGrad)" stroke="#451A03" strokeWidth="1" />
        <circle cx="36" cy="119" r="5" fill="#D4AF37" stroke="#451A03" strokeWidth="1" />
        <circle cx="124" cy="119" r="5" fill="#D4AF37" stroke="#451A03" strokeWidth="1" />
        {/* Parchment Text Lines */}
        <line x1="56" y1="52" x2="104" y2="52" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />
        <line x1="56" y1="62" x2="104" y2="62" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
        <line x1="56" y1="72" x2="104" y2="72" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
        {/* Red Wax Seal with Ribbon */}
        <path d="M 74 88 L 68 110 L 76 106 L 84 110 L 78 88 Z" fill="#991B1B" />
        <circle cx="80" cy="88" r="14" fill="url(#waxSealGrad)" stroke="#D4AF37" strokeWidth="1.5" />
        {/* Spartan Lambda in Wax Seal */}
        <path d="M 80 80 L 86 94 L 83 95 L 80 87 L 77 95 L 74 94 Z" fill="#FEF08A" />
    </svg>
);

// 9. Realistic Gold Framed Diploma (Почетная Грамота в Раме)
const RealisticGoldDiplomaFrame: React.FC<{ size?: number; isUnlocked?: boolean }> = ({ size = 120, isUnlocked = true }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-90 opacity-80' : ''}`}
    >
        <defs>
            <linearGradient id="frameGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="70%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
            <linearGradient id="diplomaPaper" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#FFFDF5" />
                <stop offset="100%" stopColor="#FEF3C7" />
            </linearGradient>
        </defs>
        <ellipse cx="80" cy="148" rx="42" ry="6" fill="black" opacity="0.6" />
        {/* Easel Stand */}
        <polygon points="54,130 106,130 114,146 46,146" fill="#18181B" stroke="#D4AF37" strokeWidth="1.5" />
        {/* Outer Frame */}
        <rect x="36" y="24" width="88" height="106" rx="4" fill="url(#frameGold)" stroke="#78350F" strokeWidth="1.5" />
        {/* Inner Glass & Paper */}
        <rect x="42" y="30" width="76" height="94" rx="2" fill="url(#diplomaPaper)" stroke="#CA8A04" strokeWidth="1" />
        {/* Diploma Ornate Greek Border */}
        <rect x="46" y="34" width="68" height="86" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="3 1.5" />
        {/* Sparta Crest at top */}
        <circle cx="80" cy="46" r="6" fill="#78350F" stroke="#D4AF37" strokeWidth="1" />
        <polygon points="80,42 82,46 86,47 83,50 84,54 80,52 76,54 77,50 74,47 78,46" fill="#FFD700" />
        {/* Header Text Line */}
        <line x1="56" y1="58" x2="104" y2="58" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" />
        {/* Text Lines */}
        <line x1="52" y1="68" x2="108" y2="68" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4 2" />
        <line x1="52" y1="76" x2="108" y2="76" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4 2" />
        <line x1="52" y1="84" x2="108" y2="84" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4 2" />
        {/* Gold Ribbon Badge at bottom */}
        <path d="M 72 98 L 66 112 L 72 109 L 78 112 L 74 98 Z" fill="#D4AF37" />
        <circle cx="80" cy="98" r="8" fill="#F59E0B" stroke="#78350F" strokeWidth="1" />
        <circle cx="80" cy="98" r="4" fill="#FEF08A" />
    </svg>
);

// =========================================================================
// 🏛️ REALISTIC 3D TROPHY CARD WITH MARBLE PEDESTAL & SPOTLIGHT
// =========================================================================
interface TrophyShowcaseCardProps {
    achievement?: UserAchievement;
    def: AchievementDefinition;
    isUnlocked: boolean;
    onClick: () => void;
}

const TrophyShowcaseCard: React.FC<TrophyShowcaseCardProps> = ({
    achievement,
    def,
    isUnlocked,
    onClick
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 400, damping: 90 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 90 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["14deg", "-14deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-14deg", "14deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) / rect.width);
        y.set((e.clientY - rect.top - rect.height / 2) / rect.height);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const isLegendary = def.rarity === 'legendary';
    const isRare = def.rarity === 'rare';

    const haloColor = isUnlocked
        ? (isLegendary ? 'rgba(234, 179, 8, 0.4)' : isRare ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.2)')
        : 'rgba(234, 179, 8, 0.08)';

    const neonRimClass = isUnlocked
        ? (isLegendary ? 'shadow-[0_0_25px_rgba(212,175,55,0.4)] border-amber-400/60' : isRare ? 'shadow-[0_0_20px_rgba(56,189,248,0.35)] border-sky-400/50' : 'shadow-lg border-white/20')
        : 'border-white/15 hover:border-amber-500/40';

    const renderTrophyIllustration = () => {
        if (def.mediaUrl) {
            if (def.type === '3d') {
                return (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-black/60 rounded-3xl border border-sparta-gold/30 backdrop-blur-sm shadow-2xl relative">
                        <Box className={isUnlocked ? (isLegendary ? "text-sparta-gold" : "text-sky-400") : "text-white/40"} size={44} />
                        <span className="absolute -bottom-2 px-2 py-0.5 bg-black/90 text-[8px] font-black rounded-full border border-sparta-gold/40 text-sparta-gold uppercase tracking-wider">
                            3D Модель
                        </span>
                    </div>
                );
            }
            return (
                <img
                    src={def.mediaUrl}
                    alt={def.title}
                    className={`w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-110 ${!isUnlocked ? 'filter grayscale contrast-110 brightness-85 opacity-80' : ''}`}
                />
            );
        }

        // Match preset ID or title/category keywords
        const preset = def.iconPreset;
        const titleLower = (def.title || '').toLowerCase();
        const catLower = (def.category || '').toLowerCase();

        // 📜 Commendation Diplomas & Scrolls
        if (preset?.startsWith('diploma_') || titleLower.includes('грамот') || titleLower.includes('диплом') || titleLower.includes('сертификат') || titleLower.includes('старан') || catLower.includes('старан')) {
            if (preset === 'diploma_effort' || titleLower.includes('свиток') || titleLower.includes('вол') || titleLower.includes('старан')) {
                return <RealisticSpartanScroll size={120} isUnlocked={isUnlocked} />;
            }
            return <RealisticGoldDiplomaFrame size={120} isUnlocked={isUnlocked} />;
        }

        if (preset === 'ball_gold' || titleLower.includes('мяч') || titleLower.includes('гол')) {
            return <RealisticGoldenBall size={120} isUnlocked={isUnlocked} />;
        }
        if (preset === 'crown_captain' || titleLower.includes('корон') || titleLower.includes('капитан') || titleLower.includes('лидер')) {
            return <RealisticCaptainCrown size={120} isUnlocked={isUnlocked} />;
        }
        if (preset === 'star_hero' || titleLower.includes('звезд') || titleLower.includes('герой')) {
            return <RealisticHeroStar size={120} isUnlocked={isUnlocked} />;
        }
        if (preset === 'shield_sparta' || titleLower.includes('щит') || catLower.includes('дисциплин') || titleLower.includes('характер') || titleLower.includes('трениров')) {
            return <RealisticSpartanShield size={120} isUnlocked={isUnlocked} />;
        }
        if (preset === 'medal_gold' || preset === 'medal_silver' || titleLower.includes('медал') || catLower.includes('спорт')) {
            return <RealisticChampionMedal size={120} isUnlocked={isUnlocked} rarity={def.rarity} />;
        }
        if (preset === 'crystal_diamond' || preset === 'lightning_spark' || titleLower.includes('кристалл') || titleLower.includes('молни') || titleLower.includes('снайпер') || isRare) {
            return <RealisticCrystalTrophy size={120} isUnlocked={isUnlocked} />;
        }
        return <RealisticGrandGoldCup size={120} isUnlocked={isUnlocked} />;
    };

    return (
        <motion.div
            ref={cardRef}
            style={{
                rotateX: isUnlocked ? rotateX : 0,
                rotateY: isUnlocked ? rotateY : 0,
                transformStyle: "preserve-3d",
                perspective: 1100
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className="relative w-full aspect-[3/4.4] cursor-pointer group select-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* 🏛️ MUSEUM GLASS SHOWCASE BOX */}
            <div className={`absolute inset-0 rounded-3xl border-2 ${neonRimClass} bg-gradient-to-b from-[#18181c] via-[#101014] to-[#08080a] overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 transition-all duration-300`}>

                {/* 💡 Dramatic Overhead Museum Spotlight */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-48 pointer-events-none transition-opacity duration-500"
                    style={{
                        background: `radial-gradient(ellipse at 50% 0%, ${haloColor}, transparent 75%)`,
                        opacity: isUnlocked ? 1 : 0.4
                    }}
                />

                {/* ✨ Reflective Glass Glint Overlay */}
                <div className="absolute inset-0 rounded-3xl mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.08) 50%, transparent 60%)'
                    }}
                />

                {/* Top Badge: Rarity & Coins */}
                <div className="relative z-10 flex items-center justify-between w-full">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        isUnlocked
                            ? (isLegendary
                                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/30 border-amber-400/60 text-amber-300'
                                : isRare
                                    ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/30 border-sky-400/60 text-sky-300'
                                    : 'bg-white/10 border-white/20 text-white/80')
                            : 'bg-white/5 border-white/10 text-white/50'
                    }`}>
                        {def.rarity === 'legendary' ? '👑 Легендарный' : def.rarity === 'rare' ? '💎 Редкий' : '⭐ Награда'}
                    </span>

                    {def.rewardCoins && def.rewardCoins > 0 ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[9px] font-bold">
                            <SpartaCoinIcon size={12} animate />
                            <span>+{def.rewardCoins}</span>
                        </div>
                    ) : isUnlocked ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-sm">
                            <CheckCircle2 size={13} />
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/40">
                            <Lock size={12} />
                        </div>
                    )}
                </div>

                {/* 🏆 Central Trophy Exhibit on Hover Elevation */}
                <div
                    className="relative z-10 flex-1 flex items-center justify-center my-1"
                    style={{ transform: isUnlocked ? "translateZ(25px)" : "none" }}
                >
                    <div
                        className="absolute w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-300 group-hover:scale-125"
                        style={{ backgroundColor: haloColor }}
                    />

                    {renderTrophyIllustration()}

                    {/* Locked Chain & Frosted Vault Badge */}
                    {!isUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                            <div className="flex items-center gap-1 bg-black/85 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                                <Lock size={10} className="text-amber-400" />
                                <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">
                                    В витрине
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🏷️ REALISTIC ENGRAVED MARBLE & BRASS PEDESTAL */}
                <div
                    className="relative z-10 w-full"
                    style={{ transform: isUnlocked ? "translateZ(15px)" : "none" }}
                >
                    <div className="w-full h-2 rounded-t-xl bg-gradient-to-r from-[#202024] via-[#3a3a44] to-[#202024] border-t border-white/20 shadow-inner" />

                    <div className={`p-2 rounded-b-xl border flex flex-col items-center text-center shadow-lg transition-colors ${
                        isUnlocked
                            ? (isLegendary
                                ? 'bg-gradient-to-b from-[#2a2210] to-[#120f08] border-amber-500/50 text-amber-200'
                                : 'bg-gradient-to-b from-[#1c1c22] to-[#0e0e12] border-white/15 text-white')
                            : 'bg-black/80 border-white/10 text-white/60'
                    }`}>
                        <div className="w-full flex items-center justify-between px-1 mb-0.5 opacity-40">
                            <span className="w-1 h-1 rounded-full bg-white/60" />
                            <span className="w-1 h-1 rounded-full bg-white/60" />
                        </div>

                        <h4 className={`font-russo text-xs sm:text-sm line-clamp-1 ${isUnlocked ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-white/80'}`}>
                            {def.title}
                        </h4>

                        {isUnlocked && achievement ? (
                            <div className="flex items-center justify-center gap-1 text-[9px] text-sparta-gold font-mono font-bold mt-0.5">
                                <Calendar size={9} />
                                <span>{new Date(achievement.date).toLocaleDateString('ru-RU')}</span>
                            </div>
                        ) : (
                            <span className="text-[9px] text-white/50 font-bold mt-0.5 flex items-center gap-1">
                                <Sparkles size={9} className="text-amber-400" />
                                <span>Выполняй задания</span>
                            </span>
                        )}
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

// =========================================================================
// 🏛️ MAIN ACHIEVEMENTS & TROPHY GALLERY COMPONENT
// =========================================================================
const AchievementsList: React.FC<AchievementsListProps> = ({
    userAchievements = [],
    showAllDefinitions = true,
    userName = 'Чемпион Спарты'
}) => {
    const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedTrophy, setSelectedTrophy] = useState<{ def: AchievementDefinition; achievement?: UserAchievement; isUnlocked: boolean } | null>(null);
    const [activeRoom, setActiveRoom] = useState<'all' | 'unlocked' | 'locked' | 'cups' | 'shields' | 'diplomas'>('all');
    const [modalTab, setModalTab] = useState<'3d' | 'certificate' | 'story'>('3d');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition));
            setDefinitions(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const userAchMap = React.useMemo(() => {
        const map: Record<string, UserAchievement> = {};
        userAchievements.forEach(ua => {
            if (ua.definitionId) map[ua.definitionId] = ua;
            if (ua.id) map[ua.id] = ua;
        });
        return map;
    }, [userAchievements]);

    const totalCount = definitions.length || 0;
    const unlockedCount = definitions.filter(d => Boolean(userAchMap[d.id])).length;
    const unlockPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    const diplomaCount = definitions.filter(d => (
        d.awardType === 'diploma' ||
        d.awardType === 'certificate' ||
        d.iconPreset?.startsWith('diploma_') ||
        (d.title || '').toLowerCase().includes('грамот') ||
        (d.title || '').toLowerCase().includes('диплом') ||
        (d.title || '').toLowerCase().includes('сертификат') ||
        (d.title || '').toLowerCase().includes('старан') ||
        (d.category || '').toLowerCase().includes('старан')
    )).length;

    const filteredTrophies = definitions.filter(def => {
        const isUnlocked = Boolean(userAchMap[def.id]);
        if (activeRoom === 'unlocked') return isUnlocked;
        if (activeRoom === 'locked') return !isUnlocked;
        if (activeRoom === 'diplomas') {
            return (
                def.awardType === 'diploma' ||
                def.awardType === 'certificate' ||
                def.iconPreset?.startsWith('diploma_') ||
                (def.title || '').toLowerCase().includes('грамот') ||
                (def.title || '').toLowerCase().includes('диплом') ||
                (def.title || '').toLowerCase().includes('сертификат') ||
                (def.title || '').toLowerCase().includes('старан') ||
                (def.category || '').toLowerCase().includes('старан')
            );
        }
        if (activeRoom === 'cups') return def.category === 'Спорт' || (def.title || '').toLowerCase().includes('кубок') || (def.title || '').toLowerCase().includes('гол') || def.iconPreset === 'cup_gold' || def.iconPreset === 'ball_gold';
        if (activeRoom === 'shields') return def.category === 'Дисциплина' || (def.title || '').toLowerCase().includes('щит') || (def.title || '').toLowerCase().includes('трениров') || def.iconPreset === 'shield_sparta';
        return true;
    });

    const handleInspectTrophy = (trophyData: { def: AchievementDefinition; achievement?: UserAchievement; isUnlocked: boolean }) => {
        setSelectedTrophy(trophyData);
        // If it's a diploma, open the Certificate tab by default
        const isDiploma = trophyData.def.awardType === 'diploma' || trophyData.def.awardType === 'certificate' || trophyData.def.iconPreset?.startsWith('diploma_') || trophyData.def.title.toLowerCase().includes('грамот') || trophyData.def.title.toLowerCase().includes('диплом');
        setModalTab(isDiploma ? 'certificate' : '3d');

        if (trophyData.isUnlocked) {
            playTriumphSound();
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 }
            });
        }
    };

    const handleTriggerConfetti = () => {
        playTriumphSound();
        confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 }
        });
    };

    const renderModalTrophy = () => {
        if (!selectedTrophy) return null;
        const { def, isUnlocked } = selectedTrophy;

        if (def.type === '3d' && def.mediaUrl) {
            return (
                <div className="w-56 h-56 relative">
                    <Suspense fallback={
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        <Viewer3D url={def.mediaUrl} height="100%" />
                    </Suspense>
                </div>
            );
        }

        if (def.mediaUrl) {
            return (
                <img
                    src={def.mediaUrl}
                    alt={def.title}
                    className="w-44 h-44 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]"
                />
            );
        }

        const preset = def.iconPreset;
        const titleLower = (def.title || '').toLowerCase();
        const catLower = (def.category || '').toLowerCase();

        if (preset?.startsWith('diploma_') || titleLower.includes('грамот') || titleLower.includes('диплом') || titleLower.includes('сертификат') || titleLower.includes('старан') || catLower.includes('старан')) {
            if (preset === 'diploma_effort' || titleLower.includes('свиток') || titleLower.includes('вол') || titleLower.includes('старан')) {
                return <RealisticSpartanScroll size={160} isUnlocked={isUnlocked} />;
            }
            return <RealisticGoldDiplomaFrame size={160} isUnlocked={isUnlocked} />;
        }

        if (preset === 'ball_gold' || titleLower.includes('мяч')) return <RealisticGoldenBall size={160} isUnlocked={isUnlocked} />;
        if (preset === 'crown_captain' || titleLower.includes('корон') || titleLower.includes('капитан')) return <RealisticCaptainCrown size={160} isUnlocked={isUnlocked} />;
        if (preset === 'star_hero' || titleLower.includes('звезд')) return <RealisticHeroStar size={160} isUnlocked={isUnlocked} />;
        if (preset === 'shield_sparta' || titleLower.includes('щит')) return <RealisticSpartanShield size={160} isUnlocked={isUnlocked} />;
        if (preset === 'medal_gold' || preset === 'medal_silver' || titleLower.includes('медал')) return <RealisticChampionMedal size={160} isUnlocked={isUnlocked} rarity={def.rarity} />;
        if (preset === 'crystal_diamond' || preset === 'lightning_spark' || titleLower.includes('кристалл') || titleLower.includes('молни')) return <RealisticCrystalTrophy size={160} isUnlocked={isUnlocked} />;
        return <RealisticGrandGoldCup size={160} isUnlocked={isUnlocked} />;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin shadow-lg shadow-sparta-gold/20" />
                <p className="text-sm font-russo text-white/70 uppercase tracking-widest">
                    Открываем Зал Славы Спарты... 🏛️
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* 🏛️ 1. HERO HALL OF FAME ATMOSPHERIC HEADER */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#18150c] via-[#101014] to-[#121018] p-6 sm:p-8 border border-sparta-gold/40 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-sparta-gold/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                <Crown size={12} className="text-sparta-gold" />
                                <span>Зал Славы и Трофеев</span>
                            </span>
                            <span className="text-xs text-white/50 font-medium">Спортивный Центр SPARTA</span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-wide">
                            Галерея Чемпионских Наград & Грамот 🏆
                        </h2>

                        <p className="text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
                            Каждый кубок, медаль и почетная грамота — это памятный триумф твоих стараний, характера и дисциплины. Рассматривай трофеи в 3D, изучай именные золотые дипломы и гордись победами!
                        </p>
                    </div>

                    <div className="shrink-0 p-4 rounded-2xl bg-black/60 border border-sparta-gold/30 flex flex-col items-center justify-center min-w-[180px] shadow-xl">
                        <div className="flex items-center gap-2 text-2xl font-russo text-sparta-gold">
                            <Trophy size={24} className="text-sparta-gold" />
                            <span>{unlockedCount} / {totalCount}</span>
                        </div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
                            Трофеев получено
                        </span>

                        <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden p-0.5 border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${unlockPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-sparta-gold shadow-sm"
                            />
                        </div>
                        <span className="text-[9px] text-sparta-gold font-bold mt-1">{unlockPercent}% Зала Славы открыто</span>
                    </div>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setActiveRoom('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'all'
                                    ? 'bg-sparta-gold text-black font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Все залы ({totalCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoom('unlocked')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'unlocked'
                                    ? 'bg-emerald-500 text-black font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Получено ({unlockedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoom('locked')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'locked'
                                    ? 'bg-white/20 text-white font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            В процессе ({totalCount - unlockedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoom('diplomas')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'diplomas'
                                    ? 'bg-amber-400 text-black font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            📜 Грамоты & Сертификаты ({diplomaCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoom('cups')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'cups'
                                    ? 'bg-amber-500 text-black font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            🏆 Кубки
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoom('shields')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeRoom === 'shields'
                                    ? 'bg-blue-500 text-black font-russo shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            🛡️ Щиты & Дисциплина
                        </button>
                    </div>

                    <span className="text-[11px] text-white/40 hidden sm:flex items-center gap-1 font-medium">
                        <Eye size={12} className="text-sparta-gold" />
                        Нажмите на любой постамент для 3D осмотра
                    </span>
                </div>
            </motion.div>

            {/* 🏛️ 2. PEDESTAL EXHIBIT GRID */}
            {filteredTrophies.length === 0 ? (
                <div className="p-12 rounded-3xl bg-black/40 border border-dashed border-white/15 flex flex-col items-center justify-center text-center space-y-3">
                    <Trophy size={48} className="text-white/20" />
                    <h3 className="text-lg font-russo text-white">Экспонаты не найдены</h3>
                    <p className="text-xs text-white/50 max-w-sm">
                        В выбранном зале пока нет наград. Администратор может добавить новые трофеи и грамоты в панели управления!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {filteredTrophies.map(def => {
                        const achievement = userAchMap[def.id];
                        const isUnlocked = Boolean(achievement);
                        return (
                            <TrophyShowcaseCard
                                key={def.id}
                                def={def}
                                achievement={achievement}
                                isUnlocked={isUnlocked}
                                onClick={() => handleInspectTrophy({ def, achievement, isUnlocked })}
                            />
                        );
                    })}
                </div>
            )}

            {/* 🔍 3. INTERACTIVE 360° INSPECTION STUDIO & CERTIFICATE MODAL */}
            <AnimatePresence>
                {selectedTrophy && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center px-3 sm:px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                            onClick={() => setSelectedTrophy(null)}
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-2xl bg-[#121216] border border-sparta-gold/50 rounded-3xl overflow-hidden shadow-2xl shadow-black flex flex-col max-h-[92vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 border border-sparta-gold/40 flex items-center justify-center text-sparta-gold">
                                        <Trophy size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-russo text-white uppercase line-clamp-1">
                                            {selectedTrophy.def.title}
                                        </h3>
                                        <span className="text-[10px] text-white/50">
                                            {selectedTrophy.isUnlocked ? '🌟 Награда разблокирована' : '🔒 Заблокированный экспонат'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setModalTab('3d')}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                modalTab === '3d' ? 'bg-sparta-gold text-black font-russo' : 'text-white/60 hover:text-white'
                                            }`}
                                        >
                                            3D Витрина
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalTab('certificate')}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                modalTab === 'certificate' ? 'bg-sparta-gold text-black font-russo' : 'text-white/60 hover:text-white'
                                            }`}
                                        >
                                            Грамота 📜
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalTab('story')}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                modalTab === 'story' ? 'bg-sparta-gold text-black font-russo' : 'text-white/60 hover:text-white'
                                            }`}
                                        >
                                            История
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedTrophy(null)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white cursor-pointer transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                {/* TAB 1: 3D VITRINE VIEW */}
                                {modalTab === '3d' && (
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="relative w-full h-64 sm:h-72 rounded-3xl bg-gradient-to-b from-[#18181f] via-[#0e0e12] to-black border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                                            <div className="absolute top-0 w-56 h-full bg-radial-at-top from-amber-400/25 via-transparent to-transparent pointer-events-none" />

                                            <div className="relative z-10 transform transition-transform hover:scale-105 duration-300">
                                                {renderModalTrophy()}
                                            </div>

                                            <div className="absolute bottom-3 w-48 h-6 bg-gradient-to-r from-[#2a2a30] via-[#444450] to-[#2a2a30] rounded-full border-t border-white/25 shadow-[0_-5px_15px_rgba(0,0,0,0.7)]" />
                                        </div>

                                        <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold">
                                                    {selectedTrophy.def.rarity === 'legendary' ? 'Легендарная награда' : 'Почетное достижение'}
                                                </span>
                                                <span className="text-[10px] text-white/50 font-bold uppercase">
                                                    Категория: {selectedTrophy.def.category || 'Спарта'}
                                                </span>
                                            </div>

                                            <h4 className="text-lg font-russo text-white uppercase">{selectedTrophy.def.title}</h4>
                                            <p className="text-xs text-white/70 leading-relaxed">
                                                {selectedTrophy.def.description || 'Почетный трофей Спортивного Центра Спарта за выдающиеся спортивные успехи, верность команде и силу духа.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: OFFICIAL GOLD DIPLOMA / CERTIFICATE OF EFFORT & CHARACTER */}
                                {modalTab === 'certificate' && (
                                    <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1a1710] via-[#12110c] to-[#0a0a08] border-4 border-double border-sparta-gold shadow-2xl text-center space-y-4 print:border-none print:p-0">
                                        {/* Golden Filigree Corner Accents */}
                                        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-sparta-gold" />
                                        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-sparta-gold" />
                                        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-sparta-gold" />
                                        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-sparta-gold" />

                                        {/* Certificate Header */}
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-1.5 text-sparta-gold font-russo text-xs uppercase tracking-widest">
                                                <span>⚔️ СПОРТИВНЫЙ ЦЕНТР SPARTA ⚔️</span>
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                                                {selectedTrophy.def.iconPreset?.startsWith('diploma_') || selectedTrophy.def.title.toLowerCase().includes('грамот')
                                                    ? 'ПОХВАЛЬНАЯ ГРАМОТА ЗА СТАРАНИЯ'
                                                    : 'ИМЕННОЙ СЕРТИФИКАТ НАГРАДЫ'}
                                            </h2>
                                            <p className="text-[10px] text-sparta-gold/70 uppercase tracking-widest font-mono">
                                                № SPARTA-{selectedTrophy.def.id.slice(0, 6).toUpperCase()} • РЕЕСТР ЧЕМПИОНОВ
                                            </p>
                                        </div>

                                        <div className="w-20 h-0.5 bg-sparta-gold/60 mx-auto" />

                                        {/* Motto if available */}
                                        {selectedTrophy.def.motto && (
                                            <p className="text-xs text-amber-300 font-serif italic max-w-md mx-auto">
                                                «{selectedTrophy.def.motto}»
                                            </p>
                                        )}

                                        {/* Certificate Body */}
                                        <div className="space-y-2">
                                            <p className="text-xs text-white/60 italic">Настоящей грамотой удостоверяется, что воспитанник</p>
                                            <div className="text-2xl sm:text-3xl font-russo text-sparta-gold uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                {userName}
                                            </div>
                                            <p className="text-xs text-white/70">
                                                за безупречное усердие, железный характер и волю к победе награждается
                                            </p>
                                            <div className="p-3.5 rounded-2xl bg-black/60 border border-sparta-gold/40 text-white font-russo text-base sm:text-lg uppercase shadow-inner">
                                                📜 «{selectedTrophy.def.title}»
                                            </div>
                                        </div>

                                        {/* Recognition Description */}
                                        <p className="text-xs text-white/80 leading-relaxed max-w-lg mx-auto italic">
                                            {selectedTrophy.def.description || 'Настоящим подтверждается, что истинная сила спартанца измеряется не только кубками, но и тем, сколько труда, упорства и души вложено в каждую минуту тренировок!'}
                                        </p>

                                        {/* Coach Commendation */}
                                        {selectedTrophy.achievement?.reason && (
                                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs italic max-w-md mx-auto">
                                                «{selectedTrophy.achievement.reason}»
                                            </div>
                                        )}

                                        {/* Certificate Footer (Signatures & Stamp) */}
                                        <div className="pt-4 border-t border-sparta-gold/20 flex items-center justify-between text-left text-xs">
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase">Дата вручения:</p>
                                                <p className="font-mono font-bold text-white text-xs">
                                                    {selectedTrophy.achievement?.date ? new Date(selectedTrophy.achievement.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU')}
                                                </p>
                                            </div>

                                            {/* Golden Club Wax Stamp */}
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-sparta-gold/80 flex flex-col items-center justify-center text-[7px] text-sparta-gold font-bold uppercase rotate-[-12deg] bg-sparta-gold/15 shadow-lg shadow-sparta-gold/20">
                                                <span>SPARTA</span>
                                                <Crown size={14} className="my-0.5 text-sparta-gold" />
                                                <span>ПЕЧАТЬ КЛУБА</span>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-[10px] text-white/40 uppercase">Тренерский совет:</p>
                                                <p className="font-russo text-sparta-gold text-xs">УТВЕРЖДЕНО ☑️</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: TRIUMPH STORY */}
                                {modalTab === 'story' && (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                                            <div className="flex items-center gap-2 text-sparta-gold text-xs font-russo uppercase">
                                                <Flame size={15} />
                                                <span>Подвиг и условие получения</span>
                                            </div>
                                            <p className="text-xs text-white/80 leading-relaxed">
                                                {selectedTrophy.def.description || 'Эта награда вручается воспитанникам Спарты, проявившим выдающееся стремление к победе, дисциплину и уважение к команде.'}
                                            </p>
                                        </div>

                                        {selectedTrophy.isUnlocked && selectedTrophy.achievement?.reason && (
                                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                                                    <CheckCircle2 size={15} />
                                                    <span>Слово наставника:</span>
                                                </div>
                                                <p className="text-xs text-white italic">
                                                    «{selectedTrophy.achievement.reason}»
                                                </p>
                                            </div>
                                        )}

                                        {!selectedTrophy.isUnlocked && (
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center">
                                                <Lock size={24} className="text-amber-400 mx-auto" />
                                                <h4 className="text-xs font-russo text-white uppercase">Как открыть эту грамоту?</h4>
                                                <p className="text-xs text-white/50 max-w-md mx-auto">
                                                    Посещайте тренировки с полной самоотдачей, преодолевайте трудности, поддерживайте партнеров по команде и наставник обязательно отметит ваши старания!
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-black/60 flex flex-wrap items-center justify-between gap-3">
                                {selectedTrophy.isUnlocked ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleTriggerConfetti}
                                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-sparta-gold text-black font-russo text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-sparta-gold/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Sparkles size={14} />
                                            <span>Отпраздновать победу! 🎉</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Printer size={14} />
                                            <span>Распечатать в рамку (A4)</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full flex items-center justify-between text-xs text-white/50">
                                        <span>🔒 Награда пока заблокирована</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTrophy(null)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold cursor-pointer transition-colors"
                                        >
                                            Понятно
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AchievementsList;

