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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-football-a4-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const giftB64 = getBase64('public/banner-assets/icon-gift-nobg.png');
const iceB64 = getBase64('public/banner-assets/icon-ice-nobg.png');
const shieldB64 = getBase64('public/banner-assets/icon-license-nobg.png');
const taxB64 = getBase64('public/banner-assets/icon-nalogi-nobg.png');

// 100% FIGMA-EDITABLE VECTOR BANNER (FOOTBALL A4 FORMAT - CLEAN SINGLE HEADER)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#00FFFF" flood-opacity="0.20"/>
    </filter>
  </defs>

  <!-- 01. ФОН БЕЗ РАСТЯЖЕНИЙ (1:1 Native A4) -->
  <g id="01. Фоновое изображение">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="none"/>
  </g>

  <!-- 02. ЕДИНСТВЕННАЯ ШАПКА: ЦСП «СПАРТА» -->
  <g id="02. Шапка" transform="translate(50, 45)">
    <image href="${crestB64}" xlink:href="${crestB64}" x="0" y="0" width="112" height="112" preserveAspectRatio="xMidYMid meet"/>
    <text x="132" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="40" font-weight="900" letter-spacing="2">
      ЦСП «СПАРТА»
    </text>
    <text x="132" y="92" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="22" font-weight="800" letter-spacing="1.5">
      ФУТБОЛЬНАЯ ШКОЛА
    </text>
  </g>

  <!-- 03. ГЛАВНЫЙ ЗАГОЛОВОК (БЕЗ ДУБЛИРОВАНИЯ ЦСП СПАРТА) -->
  <g id="03. Главный Заголовок" transform="translate(50, 680)">
    <g font-family="'Montserrat', sans-serif" font-size="110" font-weight="900" letter-spacing="2">
      <!-- 3D Экструзия темно-бордового цвета -->
      <g fill="#2A0000" transform="translate(0, 8)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#380000" transform="translate(0, 6)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#480000" transform="translate(0, 5)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#580000" transform="translate(0, 4)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#680000" transform="translate(0, 3)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#780000" transform="translate(0, 2)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>
      <g fill="#8B0000" transform="translate(0, 1)"><text x="0" y="92">СТАНЬ ЧАСТЬЮ</text><text x="0" y="196">КОМАНДЫ!</text></g>

      <!-- Лицевой Красный Слой -->
      <g fill="#FF1A1A" stroke="#FFE5E5" stroke-width="1.6" stroke-linejoin="round">
        <text x="0" y="92">СТАНЬ ЧАСТЬЮ</text>
        <text x="0" y="196">КОМАНДЫ!</text>
      </g>
    </g>
  </g>

  <!-- 04. 4 КАРТОЧКИ ПРЕИМУЩЕСТВ (2x2 GRID) -->
  <g id="04. Карточки преимуществ" transform="translate(50, 1210)">
    
    <!-- Карточка 1: Пробная тренировка 0 ₽ -->
    <g transform="translate(0, 0)">
      <rect width="555" height="124" rx="22" fill="#081E38" fill-opacity="0.80" stroke="#00FFFF" stroke-width="2"/>
      <image href="${giftB64}" xlink:href="${giftB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <text x="122" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">Пробная</text>
      <text x="122" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">тренировка 0 ₽</text>
    </g>

    <!-- Карточка 2: Заморозка при болезни -->
    <g transform="translate(585, 0)">
      <rect width="555" height="124" rx="22" fill="#081E38" fill-opacity="0.80" stroke="#00FFFF" stroke-width="2"/>
      <image href="${iceB64}" xlink:href="${iceB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <text x="122" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">Заморозка</text>
      <text x="122" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">при болезни</text>
    </g>

    <!-- Карточка 3: Гос. лицензия -->
    <g transform="translate(0, 140)">
      <rect width="555" height="124" rx="22" fill="#081E38" fill-opacity="0.80" stroke="#00FFFF" stroke-width="2"/>
      <image href="${shieldB64}" xlink:href="${shieldB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <text x="122" y="72" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">Гос. лицензия</text>
    </g>

    <!-- Карточка 4: Налоговый вычет 13% -->
    <g transform="translate(585, 140)">
      <rect width="555" height="124" rx="22" fill="#081E38" fill-opacity="0.80" stroke="#00FFFF" stroke-width="2"/>
      <image href="${taxB64}" xlink:href="${taxB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <text x="122" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">Налоговый</text>
      <text x="122" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800">вычет 13%</text>
    </g>
  </g>

  <!-- 05. ПОДВАЛ (4 АДРЕСА С КРУПНЫМ ШРИФТОМ 22px) -->
  <g id="05. Подвал" transform="translate(50, 1495)" filter="url(#footerShadow)">
    <rect width="1140" height="218" rx="24" fill="#051326" fill-opacity="0.96" stroke="rgba(0, 255, 255, 0.5)" stroke-width="2"/>

    <!-- Левая колонка -->
    <g id="Контакты Телефоны" transform="translate(36, 40)">
      <circle cx="28" cy="28" r="28" fill="rgba(0, 255, 255, 0.15)" stroke="#00FFFF" stroke-width="2"/>
      <path d="M36 31.5V34.5C36 35.5 35 36.5 34 36.5C25 36 20 31 19.5 22C19.5 21 20.5 20 21.5 20H24.5C25.5 20 26.3 20.8 26.5 21.8C26.7 23 27.2 24.2 27.9 25.2C28.4 25.9 28.2 26.8 27.5 27.3L26.2 28.3C27.4 30.5 29.5 32.6 31.7 33.8L32.7 32.5C33.2 31.8 34.1 31.6 34.8 32.1C35.8 32.8 37 33.3 38.2 33.5C39.2 33.7 40 34.5 40 35.5" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      
      <text x="82" y="26" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="82" y="60" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
      <text x="82" y="94" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="20" font-weight="600">bugrova.k@bk.ru</text>
    </g>

    <!-- Правая колонка: 4 Адреса -->
    <g id="Адреса Филиалов" transform="translate(620, 34)">
      <circle cx="28" cy="28" r="28" fill="rgba(0, 255, 255, 0.15)" stroke="#00FFFF" stroke-width="2"/>
      <path d="M28 15C23.5 15 20 18.5 20 23C20 28.5 28 37 28 37C28 37 36 28.5 36 23C36 18.5 32.5 15 28 15Z" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="28" cy="23" r="4" fill="#00FFFF"/>

      <text x="80" y="20" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21.5" font-weight="700">ул. Большевистская 125,</text>
      <text x="80" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21.5" font-weight="700">ул. Планетная 53,</text>
      <text x="80" y="84" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21.5" font-weight="700">ул. Мясниковой 25/2,</text>
      <text x="80" y="116" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21.5" font-weight="700">ул. Ласковая 18</text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-football-a4-vector.svg'),
  path.resolve(__dirname, '../public/sparta-football-a4.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ Football A4 Vector SVG (Clean Single Header) saved to: ' + p);
}
