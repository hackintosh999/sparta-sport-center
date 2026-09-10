import React from 'react';

interface SpartaPromoBannerProps {
  className?: string;
  onCtaClick?: () => void;
}

export const SpartaPromoBanner: React.FC<SpartaPromoBannerProps> = ({
  className = '',
  onCtaClick,
}) => {
  return (
    <div className={`relative max-w-[512px] w-full aspect-[1/2] rounded-2xl overflow-hidden shadow-2xl select-none ${className}`}>
      {/* Background Image */}
      <img
        src="/banner/background.jpg"
        alt="Спортивный центр СПАРТА"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Title: БОЛЬШОЙ ТЕННИС */}
      <div className="absolute top-[4.2%] inset-x-0 flex justify-center">
        <h2 className="text-white font-extrabold text-[22px] tracking-[0.18em] uppercase drop-shadow-[0_2px_4px_rgba(0,40,60,0.8)]">
          БОЛЬШОЙ ТЕННИС
        </h2>
      </div>

      {/* Left Badges (Tennis) with Glossy Sheen */}
      <div className="absolute top-[33.3%] left-0 flex flex-col gap-2 items-start">
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1e8494] via-[#146d7a] to-[#0e4e58] border-t border-white/40 border-r border-white/20 text-white pl-5 pr-4 py-2 rounded-r-xl shadow-lg">
          {/* Glass Gloss Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
          <div className="absolute -top-4 -bottom-4 left-6 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none" />
          <p className="relative z-10 text-[12.5px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,30,40,0.8)]">Пробная тренировка</p>
          <p className="relative z-10 text-[12.5px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,30,40,0.8)]">в подарок</p>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1e8494] via-[#146d7a] to-[#0e4e58] border-t border-white/40 border-r border-white/20 text-white pl-5 pr-4 py-2 rounded-r-xl shadow-lg w-fit">
          {/* Glass Gloss Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
          <div className="absolute -top-4 -bottom-4 left-5 w-6 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none" />
          <p className="relative z-10 text-[12.5px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,30,40,0.8)]">Гос. лицензия</p>
        </div>
      </div>

      {/* Diagonal Ribbon Text */}
      <div
        className="absolute top-[48%] left-[46%] -translate-x-1/2 -translate-y-1/2 -rotate-[43.5deg] pointer-events-none flex flex-col items-center"
        style={{ transformOrigin: 'center center' }}
      >
        <span className="text-[32px] font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#fff8d1] via-[#fceda3] to-[#e2bf65] drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] whitespace-nowrap">
          СТАНЬ ЧАСТЬЮ
        </span>
        <span className="text-[17px] font-extrabold tracking-wide uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] whitespace-nowrap -mt-1 ml-16">
          КОМАНДЫ ЦСП &quot;СПАРТА&quot;
        </span>
      </div>

      {/* Sparta Seal / Medallion */}
      <div className="absolute top-[63.5%] left-[29.5%] -translate-x-1/2 -translate-y-1/2 w-[98px] h-[98px] rounded-full p-[3px] bg-gradient-to-br from-[#fce38a] via-[#d7ac55] to-[#9e762c] shadow-2xl flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#9e2329] via-[#7c151b] to-[#550b10] border border-[#e1b95f]/70 flex items-center justify-center relative p-2 shadow-inner">
          <img
            src="/banner/logo.png"
            alt="Спарта логотип"
            className="w-full h-full object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Right Badges (Football) with Glossy Sheen */}
      <div className="absolute top-[68.7%] right-0 flex flex-col gap-2 items-end">
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1e8494] via-[#146d7a] to-[#0e4e58] border-t border-white/40 border-l border-white/20 text-white pl-4 pr-5 py-2 rounded-l-xl shadow-lg">
          {/* Glass Gloss Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
          <div className="absolute -top-4 -bottom-4 right-8 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none" />
          <p className="relative z-10 text-[12.5px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,30,40,0.8)]">Заморозка при болезни</p>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1e8494] via-[#146d7a] to-[#0e4e58] border-t border-white/40 border-l border-white/20 text-white pl-4 pr-5 py-2 rounded-l-xl shadow-lg">
          {/* Glass Gloss Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
          <div className="absolute -top-4 -bottom-4 right-8 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none" />
          <p className="relative z-10 text-[12.5px] font-medium leading-tight drop-shadow-[0_1px_2px_rgba(0,30,40,0.8)]">Налоговый вычет 13%</p>
        </div>
      </div>

      {/* Football Title */}
      <div className="absolute bottom-[16%] right-[10%]">
        <h3 className="text-white font-black italic text-[22px] tracking-widest uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          ФУТБОЛ
        </h3>
      </div>

      {/* Голубое / бирюзовое полотно (Authentic Teal Ribbon Footer) */}
      <div className="absolute inset-x-0 bottom-0 h-[145px] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 512 145" preserveAspectRatio="none">
          <defs>
            <linearGradient id="react-footer-teal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e4c58" />
              <stop offset="35%" stopColor="#093842" />
              <stop offset="100%" stopColor="#051c22" />
            </linearGradient>
            <filter id="react-line-glow" x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Shaded Ribbon Body */}
          <path d="M 0 46 L 160 36 L 270 27 L 512 0 L 512 145 L 0 145 Z" fill="url(#react-footer-teal)" />
          {/* Glowing Gold / Cyan Top Edge Line */}
          <path d="M 0 46 L 160 36 L 270 27 L 512 0" fill="none" stroke="#ebd07d" strokeWidth="2.5" filter="url(#react-line-glow)" />
        </svg>
      </div>

      {/* Contacts & Addresses directly on the Blue Ribbon (Exact Reference Positioning) */}
      <div className="absolute bottom-[2.5%] left-[38.8%] right-5 flex justify-between items-end text-[10.5px] font-medium z-10">
        {/* Left Column: Phones & Email */}
        <div className="flex flex-col gap-1 text-left">
          <a href="tel:+79193393399" className="text-white font-semibold text-[11px] hover:text-[#2dd7cc] transition-colors leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            +7 (919) 339 33 99
          </a>
          <a href="tel:+73512301269" className="text-white font-semibold text-[11px] hover:text-[#2dd7cc] transition-colors leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            +7 (351) 230 12 69
          </a>
          <span className="text-[#2dd7cc] font-semibold text-[10.5px] leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            bugrova.k@bk.ru
          </span>
        </div>

        {/* Right Column: Branch Addresses */}
        <div className="flex flex-col gap-1 text-white text-left leading-tight font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-[10.5px]">
          <span>ул. Большевистская 125.</span>
          <span>ул. Планетная 53.</span>
          <span>ул. Мясниковой 25/2</span>
        </div>
      </div>
    </div>
  );
};

export default SpartaPromoBanner;
