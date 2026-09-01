import React from 'react';

export const Sparta3DShield: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="shieldGoldGrad" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFF2A3" />
                <stop offset="30%" stopColor="#F59E0B" />
                <stop offset="70%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="shieldInnerGrad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1E1E1E" />
                <stop offset="100%" stopColor="#080808" />
            </linearGradient>
            <linearGradient id="spartaVGrad" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <filter id="shield3DShadow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#F59E0B" floodOpacity="0.4" />
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
            </filter>
        </defs>
        <g filter="url(#shield3DShadow)">
            {/* Outer Golden Shield Rim */}
            <path
                d="M32 4L10 12C10 28 16 48 32 60C48 48 54 28 54 12L32 4Z"
                fill="url(#shieldGoldGrad)"
                stroke="#FFE57F"
                strokeWidth="1.5"
            />
            {/* Inner Dark Glass Shield */}
            <path
                d="M32 8L14 15C14 28 19 45 32 55C45 45 50 28 50 15L32 8Z"
                fill="url(#shieldInnerGrad)"
                stroke="url(#shieldGoldGrad)"
                strokeWidth="1"
            />
            {/* Sparta Lambda / Crest */}
            <path
                d="M32 16L42 42H36L32 29L28 42H22L32 16Z"
                fill="url(#spartaVGrad)"
            />
            {/* Bevel highlight */}
            <path
                d="M32 4L10 12C10 20 12 32 17 40L32 16L47 40C52 32 54 20 54 12L32 4Z"
                fill="white"
                fillOpacity="0.12"
            />
        </g>
    </svg>
);

export const Ball3D: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <radialGradient id="ballSphere" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#D1D5DB" />
                <stop offset="100%" stopColor="#374151" />
            </radialGradient>
            <radialGradient id="goldAcc" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            <filter id="ballShadow" x="0" y="0" width="64" height="64">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>
        </defs>
        <g filter="url(#ballShadow)">
            <circle cx="32" cy="32" r="26" fill="url(#ballSphere)" stroke="#E5E7EB" strokeWidth="1" />
            {/* Pentagons */}
            <polygon points="32,20 38,25 36,32 28,32 26,25" fill="url(#goldAcc)" stroke="#92400E" strokeWidth="1" />
            <polygon points="32,6 38,10 35,16 29,16 26,10" fill="#1F2937" opacity="0.85" />
            <polygon points="50,22 56,26 53,33 47,31 46,24" fill="#1F2937" opacity="0.85" />
            <polygon points="14,22 18,24 17,31 11,33 8,26" fill="#1F2937" opacity="0.85" />
            <polygon points="42,46 48,43 51,49 46,54 40,52" fill="#1F2937" opacity="0.85" />
            <polygon points="22,46 24,52 18,54 13,49 16,43" fill="#1F2937" opacity="0.85" />
            {/* Specular Highlight */}
            <ellipse cx="24" cy="18" rx="8" ry="4" fill="#FFFFFF" fillOpacity="0.45" transform="rotate(-30 24 18)" />
        </g>
    </svg>
);

export const Trophy3D: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
            <linearGradient id="trophyGold" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="35%" stopColor="#F59E0B" />
                <stop offset="75%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <filter id="trophyGlow">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#F59E0B" floodOpacity="0.4" />
            </filter>
        </defs>
        <g filter="url(#trophyGlow)">
            {/* Handles */}
            <path d="M18 14C10 14 8 26 16 32C20 35 24 34 24 34" stroke="url(#trophyGold)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M46 14C54 14 56 26 48 32C44 35 40 34 40 34" stroke="url(#trophyGold)" strokeWidth="3.5" strokeLinecap="round" />
            {/* Cup Body */}
            <path d="M20 10H44V26C44 34 38 40 32 40C26 40 20 34 20 26V10Z" fill="url(#trophyGold)" />
            {/* Stem & Base */}
            <path d="M30 40H34V48H30V40Z" fill="url(#trophyGold)" />
            <path d="M22 48H42V56H22V48Z" fill="url(#trophyGold)" />
            {/* Bevel highlight */}
            <path d="M24 12H40V16H24V12Z" fill="white" fillOpacity="0.3" />
        </g>
    </svg>
);

export { SpartaCoinIcon } from './SpartaCoinIcon';

