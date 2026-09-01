import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBase64(relPath) {
  const full = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(full)) {
    const ext = path.extname(full).replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
    const data = fs.readFileSync(full).toString('base64');
    return `data:${mime};base64,${data}`;
  }
  return '';
}

const bgPhotoB64 = getBase64('public/banner-assets/lotus-ballet-hero-art.jpg');
const iconBalletB64 = getBase64('public/banner-assets/icon-3d-ballet.png');
const iconStretchB64 = getBase64('public/banner-assets/icon-3d-stretch.png');
const iconRhythmB64 = getBase64('public/banner-assets/icon-3d-rhythm.png');
const iconTrophyB64 = getBase64('public/banner-assets/icon-3d-trophy.png');
const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <!-- Paper Grain Noise Filter -->
    <filter id="paperGrain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.025 0"/>
    </filter>

    <filter id="glassShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#1C2920" flood-opacity="0.08"/>
    </filter>
    <filter id="guaranteeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1C2920" flood-opacity="0.07"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#142018" flood-opacity="0.45"/>
    </filter>
    <filter id="btnShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#D4A853" flood-opacity="0.5"/>
    </filter>
    <filter id="sparkleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#D4A853" flood-opacity="0.8"/>
    </filter>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="#FFFFFF" flood-opacity="0.95"/>
    </filter>

    <!-- Gradients -->
    <linearGradient id="lotusPillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2D4636"/>
      <stop offset="100%" stop-color="#1C2E23"/>
    </linearGradient>

    <linearGradient id="goldBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5BE6C"/>
      <stop offset="50%" stop-color="#D4A853"/>
      <stop offset="100%" stop-color="#C49642"/>
    </linearGradient>

    <linearGradient id="topLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EBF1ED" stop-opacity="0.88"/>
      <stop offset="60%" stop-color="#EBF1ED" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#EBF1ED" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 0. ФОН: ВИЗУАЛЬНЫЙ АРТ С БАЛЕРИНОЙ -->
  <g id="0. Фон (Background)">
    <image href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice"/>
    <rect width="1240" height="480" fill="url(#topLightGrad)"/>
  </g>

  <!-- 1. ШАПКА: ЛОГОТИП И ГЛАВНЫЙ ЗАГОЛОВОК -->
  <g id="1. Шапка (Header)" transform="translate(60, 42)">
    <!-- Тонкие орбиты -->
    <g id="Орбиты">
      <ellipse cx="560" cy="180" rx="380" ry="145" fill="none" stroke="#D4A853" stroke-opacity="0.4" stroke-width="1.5" transform="rotate(-6 560 180)"/>
      <ellipse cx="560" cy="180" rx="490" ry="185" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.5" transform="rotate(4 560 180)"/>
    </g>

    <!-- Логотип LOTUS (Вариант 4) -->
    <g id="Логотип" transform="translate(560, 0)">
      <!-- Символ лотоса -->
      <g transform="translate(-22, 0)">
        <path d="M22 4C22 4 15 15 15 24C15 29 18 33 22 35C26 33 29 29 29 24C29 15 22 4 22 4Z" fill="#2D4636"/>
        <path d="M22 35C18 33 11 29 8 21C5 13 12 12 12 12C12 12 10 22 22 30" fill="#3D5A47" fill-opacity="0.8"/>
        <path d="M22 35C26 33 33 29 36 21C39 13 32 12 32 12C32 12 34 22 22 30" fill="#3D5A47" fill-opacity="0.8"/>
      </g>
      <text x="0" y="68" text-anchor="middle" fill="#2D4636" font-family="'Cormorant Garamond', 'Playfair Display', Georgia, serif" font-size="38" font-weight="700" letter-spacing="10">
        LOTUS
      </text>
      <text x="0" y="86" text-anchor="middle" fill="#526B5C" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="800" letter-spacing="3">
        KIDS' BALLET SCHOOL
      </text>
    </g>

    <!-- Главный акцентный заголовок -->
    <g id="Главный заголовок" transform="translate(560, 150)" filter="url(#textGlow)">
      <text x="0" y="0" text-anchor="middle" fill="#1C221E" font-family="'Cormorant Garamond', Georgia, serif" font-size="68" font-weight="700" letter-spacing="3">
        ШКОЛА БАЛЕТА LOTUS
      </text>
      <!-- Пилюля Открываем набор -->
      <g transform="translate(-230, 16)">
        <rect width="460" height="38" rx="19" fill="url(#lotusPillGrad)" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1"/>
        <text x="230" y="24" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15" font-weight="800" letter-spacing="2">
          ОТКРЫВАЕМ НАБОР • ДЕТИ ОТ 3 ЛЕТ
        </text>
      </g>
    </g>

    <!-- Подстрочник -->
    <g id="Подстрочник" transform="translate(560, 252)">
      <text x="0" y="0" text-anchor="middle" fill="#38423C" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="600" font-style="italic">
        «Бережное развитие грации, здоровой осанки и любви к танцу с ранних лет.»
      </text>
    </g>
  </g>

  <!-- 2. БЛОК ЦЕННОСТЕЙ (СТЕКЛЯННЫЕ МАТОВЫЕ ПЛАШКИ GLASSMORPHISM) -->
  <g id="2. Блок ценностей">
    
    <!-- ЛЕВАЯ КОЛОНКА (x: 45) -->
    <g id="Левая колонка" transform="translate(45, 960)">
      <!-- Ценность 1: Осанка -->
      <g transform="translate(0, 0)" filter="url(#glassShadow)">
        <rect width="440" height="74" rx="22" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
        <line x1="20" y1="1" x2="420" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
        <image href="${iconBalletB64}" x="12" y="13" width="48" height="48"/>
        <text x="68" y="30" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="18" font-weight="800">🩰 Красивая осанка</text>
        <text x="68" y="52" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">формирование крепкого мышечного корсета</text>
        <text x="424" y="14" fill="#D4A853" font-size="16" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Ценность 2: Растяжка -->
      <g transform="translate(0, 92)" filter="url(#glassShadow)">
        <rect width="440" height="74" rx="22" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
        <line x1="20" y1="1" x2="420" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
        <image href="${iconStretchB64}" x="12" y="13" width="48" height="48"/>
        <text x="68" y="30" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="18" font-weight="800">🌿 Бережная растяжка</text>
        <text x="68" y="52" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">развитие природной гибкости без боли и слёз</text>
        <text x="424" y="68" fill="#D4A853" font-size="16" filter="url(#sparkleGlow)">✦</text>
      </g>
    </g>

    <!-- ПРАВАЯ КОЛОНКА (x: 755) -->
    <g id="Правая колонка" transform="translate(755, 960)">
      <!-- Ценность 3: Ритм -->
      <g transform="translate(0, 0)" filter="url(#glassShadow)">
        <rect width="440" height="74" rx="22" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
        <line x1="20" y1="1" x2="420" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
        <image href="${iconRhythmB64}" x="12" y="13" width="48" height="48"/>
        <text x="68" y="30" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="18" font-weight="800">🎶 Чувство ритма</text>
        <text x="68" y="52" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">умение слышать классическую музыку</text>
        <text x="14" y="14" fill="#D4A853" font-size="16" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Ценность 4: Сцена -->
      <g transform="translate(0, 92)" filter="url(#glassShadow)">
        <rect width="440" height="74" rx="22" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
        <line x1="20" y1="1" x2="420" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
        <image href="${iconTrophyB64}" x="12" y="13" width="48" height="48"/>
        <text x="68" y="30" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="18" font-weight="800">✨ Сценический опыт</text>
        <text x="68" y="52" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">открытые уроки, костюмы и аплодисменты</text>
        <text x="14" y="68" fill="#D4A853" font-size="16" filter="url(#sparkleGlow)">✦</text>
      </g>
    </g>

  </g>

  <!-- 3. БЛОК ГАРАНТИЙ (3 ПЛАШКИ В РЯД) -->
  <g id="3. Блок гарантий" transform="translate(45, 1430)">
    <!-- Гарантия 1 -->
    <g transform="translate(0, 0)" filter="url(#guaranteeShadow)">
      <rect width="365" height="66" rx="18" fill="#FFFFFF" fill-opacity="0.76" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
      <line x1="18" y1="1" x2="347" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
      <text x="182" y="27" text-anchor="middle" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="16.5" font-weight="800">0 ₽</text>
      <text x="182" y="49" text-anchor="middle" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">Первое пробное занятие</text>
    </g>

    <!-- Гарантия 2 -->
    <g transform="translate(392, 0)" filter="url(#guaranteeShadow)">
      <rect width="365" height="66" rx="18" fill="#FFFFFF" fill-opacity="0.76" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
      <line x1="18" y1="1" x2="347" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
      <text x="182" y="27" text-anchor="middle" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="16.5" font-weight="800">Чуткие педагоги</text>
      <text x="182" y="49" text-anchor="middle" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">Бережная методика</text>
    </g>

    <!-- Гарантия 3 -->
    <g transform="translate(785, 0)" filter="url(#guaranteeShadow)">
      <rect width="365" height="66" rx="18" fill="#FFFFFF" fill-opacity="0.76" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1"/>
      <line x1="18" y1="1" x2="347" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.98"/>
      <text x="182" y="27" text-anchor="middle" fill="#1C2920" font-family="Onest, Montserrat, sans-serif" font-size="16.5" font-weight="800">Гослицензия</text>
      <text x="182" y="49" text-anchor="middle" fill="#3C4A42" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">Налоговый вычет 13%</text>
    </g>
  </g>

  <!-- 4. МОНОЛИТНЫЙ ХВОЙНЫЙ ФУТЕР (#1C2920) -->
  <g id="4. Футер (Footer Dock)" transform="translate(40, 1590)" filter="url(#footerShadow)">
    <rect width="1160" height="120" rx="24" fill="#1C2920" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1"/>
    <line x1="24" y1="1" x2="1136" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.25"/>

    <!-- Филиалы (слева) -->
    <g transform="translate(32, 24)">
      <text x="0" y="16" fill="#D4A853" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">📍 Адреса филиалов в Новосибирске:</text>
      <text x="0" y="40" fill="#D6E0D9" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Большевистская, 125</text>
      <text x="0" y="60" fill="#D6E0D9" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Планетная, 53</text>
      <text x="0" y="80" fill="#D6E0D9" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Мясниковой, 25/2</text>
    </g>

    <!-- Кнопка CTA (по центру) -->
    <g transform="translate(400, 29)" filter="url(#btnShadow)">
      <rect width="360" height="62" rx="31" fill="url(#goldBtnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <line x1="30" y1="2" x2="330" y2="2" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.6"/>
      <text x="180" y="38" text-anchor="middle" fill="#16221A" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="900" letter-spacing="1">
        ЗАПИСАТЬСЯ НА ПРОБНЫЙ УРОК →
      </text>
    </g>

    <!-- Телефоны и QR (справа) -->
    <g transform="translate(800, 24)">
      <!-- Телефоны -->
      <g transform="translate(230, 10)">
        <text x="0" y="14" text-anchor="end" fill="#A3B5AA" font-family="Montserrat, sans-serif" font-size="12" font-weight="700">Телефоны руководства</text>
        <text x="0" y="36" text-anchor="end" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">+7 (913) 765-4321</text>
        <text x="0" y="58" text-anchor="end" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">+7 (383) 221-1222</text>
      </g>

      <!-- QR код -->
      <g transform="translate(250, 6)">
        <rect width="74" height="74" rx="12" fill="#FFFFFF"/>
        <image href="${realQrB64}" x="4" y="4" width="66" height="66"/>
      </g>
    </g>
  </g>

  <!-- 5. ФАКТУРА МАТОВОЙ БУМАГИ -->
  <rect width="1240" height="1754" filter="url(#paperGrain)" pointer-events="none"/>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/lotus-ballet-master-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated dedicated LOTUS Ballet Master Banner SVG!');
