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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-tennis-a4-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const giftB64 = getBase64('public/banner-assets/tennis-icon-gift.png');
const iceB64 = getBase64('public/banner-assets/tennis-icon-ice.png');
const shieldB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const taxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

// 100% FIGMA-EDITABLE VECTOR BANNER (TENNIS A4 FORMAT WITH GOLD CREST)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <!-- Градиент для 3D карточек тенниса -->
    <linearGradient id="cardTnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7EFBD0" stop-opacity="0.92"/>
      <stop offset="38%" stop-color="#64DCD7" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#B589D6" stop-opacity="0.92"/>
    </linearGradient>

    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#26C6DA" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- 01. ФОН БЕЗ РАСТЯЖЕНИЙ (1:1 Native A4) -->
  <g id="01. Фоновое изображение">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="none"/>
  </g>

  <!-- 02. ВЕРХНИЙ БЛОК: КРУПНЫЙ ЗОЛОТОЙ ГЕРБ + ГЛАВНЫЙ ЗАГОЛОВОК -->
  <g id="02. Главный Заголовок с Гербом" transform="translate(620, 24)">
    <!-- Крупный золотой герб со львом ЦСП Спарта (155x155) -->
    <image href="${crestB64}" xlink:href="${crestB64}" x="-77" y="0" width="155" height="155" preserveAspectRatio="xMidYMid meet"/>
    
    <text x="0" y="180" text-anchor="middle" fill="#0B4E49" font-family="'Montserrat', sans-serif" font-size="32" font-weight="900" letter-spacing="2">
      ЦСП «СПАРТА» ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ:
    </text>
    
    <g transform="translate(0, 196)" font-family="'Montserrat', sans-serif" font-size="150" font-weight="900" letter-spacing="2.5">
      <!-- 3D Экструзия темно-бирюзового цвета (Y 2..8) -->
      <g fill="#052123" transform="translate(0, 8)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#06282B" transform="translate(0, 7)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#083033" transform="translate(0, 6)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#09373B" transform="translate(0, 5)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0B3E42" transform="translate(0, 4)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0D454A" transform="translate(0, 3)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0F4D52" transform="translate(0, 2)"><text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="270" text-anchor="middle">ТЕННИС</text></g>

      <!-- Лицевой Текст (Мятно-белый #E0FFF8 с белой обводкой) -->
      <g fill="#E0FFF8" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round">
        <text x="0" y="130" text-anchor="middle">БОЛЬШОЙ</text>
        <text x="0" y="270" text-anchor="middle">ТЕННИС</text>
      </g>
    </g>
  </g>

  <!-- 03. 4 КАРТОЧКИ ПРЕИМУЩЕСТВ (2x2 GRID С КРУПНЫМ ШРИФТОМ 28.5px) -->
  <g id="03. Карточки преимуществ" transform="translate(50, 1210)">
    
    <!-- Карточка 1: Пробная тренировка 0 ₽ -->
    <g transform="translate(0, 0)">
      <rect width="555" height="124" rx="22" fill="url(#cardTnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <image href="${giftB64}" xlink:href="${giftB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900" transform="translate(2.5, 3)">
        <text x="122" y="52">Пробная</text>
        <text x="122" y="88">тренировка 0 ₽</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900">
        <text x="122" y="52">Пробная</text>
        <text x="122" y="88">тренировка 0 ₽</text>
      </g>
    </g>

    <!-- Карточка 2: Заморозка при болезни -->
    <g transform="translate(585, 0)">
      <rect width="555" height="124" rx="22" fill="url(#cardTnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <image href="${iceB64}" xlink:href="${iceB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900" transform="translate(2.5, 3)">
        <text x="122" y="52">Заморозка</text>
        <text x="122" y="88">при болезни</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900">
        <text x="122" y="52">Заморозка</text>
        <text x="122" y="88">при болезни</text>
      </g>
    </g>

    <!-- Карточка 3: Гос. лицензия -->
    <g transform="translate(0, 140)">
      <rect width="555" height="124" rx="22" fill="url(#cardTnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <image href="${shieldB64}" xlink:href="${shieldB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900" transform="translate(2.5, 3)">
        <text x="122" y="72">Гос. лицензия</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900">
        <text x="122" y="72">Гос. лицензия</text>
      </g>
    </g>

    <!-- Карточка 4: Налоговый вычет 13% -->
    <g transform="translate(585, 140)">
      <rect width="555" height="124" rx="22" fill="url(#cardTnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <image href="${taxB64}" xlink:href="${taxB64}" x="16" y="18" width="88" height="88" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900" transform="translate(2.5, 3)">
        <text x="122" y="52">Налоговый</text>
        <text x="122" y="88">вычет 13%</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28.5" font-weight="900">
        <text x="122" y="52">Налоговый</text>
        <text x="122" y="88">вычет 13%</text>
      </g>
    </g>
  </g>

  <!-- 04. ПОДВАЛ (3 АДРЕСА С КРУПНЫМ ШРИФТОМ 23.5px) -->
  <g id="04. Подвал" transform="translate(50, 1495)" filter="url(#footerShadow)">
    <rect width="1140" height="218" rx="24" fill="#061C1A" fill-opacity="0.97" stroke="#26C6DA" stroke-width="2"/>

    <!-- Левая колонка: Телефоны -->
    <g id="Контакты Телефоны" transform="translate(36, 44)">
      <circle cx="28" cy="28" r="28" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M36 31.5V34.5C36 35.5 35 36.5 34 36.5C25 36 20 31 19.5 22C19.5 21 20.5 20 21.5 20H24.5C25.5 20 26.3 20.8 26.5 21.8C26.7 23 27.2 24.2 27.9 25.2C28.4 25.9 28.2 26.8 27.5 27.3L26.2 28.3C27.4 30.5 29.5 32.6 31.7 33.8L32.7 32.5C33.2 31.8 34.1 31.6 34.8 32.1C35.8 32.8 37 33.3 38.2 33.5C39.2 33.7 40 34.5 40 35.5" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      
      <text x="82" y="32" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="82" y="70" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
    </g>

    <!-- Правая колонка: 3 Адреса -->
    <g id="Адреса Филиалов" transform="translate(620, 42)">
      <circle cx="28" cy="28" r="28" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M28 15C23.5 15 20 18.5 20 23C20 28.5 28 37 28 37C28 37 36 28.5 36 23C36 18.5 32.5 15 28 15Z" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="28" cy="23" r="4" fill="#26C6DA"/>

      <text x="80" y="24" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">ул. Большевистская 125,</text>
      <text x="80" y="58" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">ул. Планетная 53,</text>
      <text x="80" y="92" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">ул. Мясниковой 25/2</text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-vector.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-a4.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ Tennis A4 Vector SVG (With Gold Sparta Crest) saved to: ' + p);
}
