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

const bgConceptB64 = getBase64('public/banner-assets/sparta-duo-concept-master.jpg');
const iconGiftB64 = getBase64('public/banner-assets/icon-gift-nobg.png');
const iconIceB64 = getBase64('public/banner-assets/icon-ice-nobg.png');
const iconLicenseB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const iconTaxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

// 100% FIGMA-NATIVE MASTER VECTOR SVG: EXACT DUO ROLLUP CONCEPT
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1012" height="2048" viewBox="0 0 1012 2048">
  <defs>
    <!-- Градиент для карточек преимуществ -->
    <linearGradient id="cardConceptGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#082036" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0C2D44" stop-opacity="0.80"/>
    </linearGradient>

    <!-- Тени -->
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.75"/>
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#26C6DA" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- ==================== 01. ФОНОВЫЙ СУПЕР-АРТВОРК ==================== -->
  <g id="01. Фоновое изображение (Артворк)">
    <image href="${bgConceptB64}" xlink:href="${bgConceptB64}" x="0" y="0" width="1012" height="2048" preserveAspectRatio="none"/>
  </g>

  <!-- ==================== 02. РЕДАКТИРУЕМЫЙ ВЕКТОРНЫЙ ТЕКСТ ДЛЯ FIGMA ==================== -->
  <!-- 1. Шапка ЦСП СПАРТА -->
  <g id="02. Шапка ЦСП СПАРТА" transform="translate(506, 215)">
    <text x="0" y="0" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="42" font-weight="900" letter-spacing="3">
      ЦСП «СПАРТА»
    </text>
  </g>

  <!-- 2. 3D Заголовок Футбола (Верх справа) -->
  <g id="03. Заголовок Футбол 3D" transform="translate(730, 290)" font-family="'Montserrat', sans-serif" font-size="42" font-weight="900" letter-spacing="1.5">
    <g fill="#500000" transform="translate(0, 4)"><text x="0" y="40" text-anchor="middle">СТАНЬ ЧАСТЬЮ</text><text x="0" y="85" text-anchor="middle">КОМАНДЫ!</text></g>
    <g fill="#600000" transform="translate(0, 3)"><text x="0" y="40" text-anchor="middle">СТАНЬ ЧАСТЬЮ</text><text x="0" y="85" text-anchor="middle">КОМАНДЫ!</text></g>
    <g fill="#700000" transform="translate(0, 2)"><text x="0" y="40" text-anchor="middle">СТАНЬ ЧАСТЬЮ</text><text x="0" y="85" text-anchor="middle">КОМАНДЫ!</text></g>
    <g fill="#FF2A2A" stroke="#FFE0E0" stroke-width="1.2" stroke-linejoin="round">
      <text x="0" y="40" text-anchor="middle">СТАНЬ ЧАСТЬЮ</text>
      <text x="0" y="85" text-anchor="middle">КОМАНДЫ!</text>
    </g>
  </g>

  <!-- 3. 3D Заголовок Тенниса (Справа по центру) -->
  <g id="04. Заголовок Теннис 3D" transform="translate(710, 1120)">
    <g font-family="'Montserrat', sans-serif" font-size="86" font-weight="900" letter-spacing="2">
      <g fill="#052123" transform="translate(0, 8)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#06282B" transform="translate(0, 7)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#083033" transform="translate(0, 6)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#09373B" transform="translate(0, 5)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0B3E42" transform="translate(0, 4)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0D454A" transform="translate(0, 3)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0F4D52" transform="translate(0, 2)"><text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="165" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#E0FFF8" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round">
        <text x="0" y="80" text-anchor="middle">БОЛЬШОЙ</text>
        <text x="0" y="165" text-anchor="middle">ТЕННИС</text>
      </g>
    </g>
    <text x="0" y="215" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="32" font-weight="900" letter-spacing="2">
      ОТКРЫВАЕТ НАБОР
    </text>
  </g>

  <!-- 4. Карточки преимуществ (2x2) -->
  <g id="05. Карточки преимуществ" transform="translate(55, 1420)">
    
    <!-- Карточка 1: Пробная тренировка 0 ₽ -->
    <g transform="translate(0, 0)">
      <rect width="435" height="126" rx="22" fill="url(#cardConceptGrad)" stroke="#00FFFF" stroke-opacity="0.6" stroke-width="1.8"/>
      <text x="24" y="54" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">Пробная</text>
      <text x="24" y="90" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">тренировка <tspan fill="#FFD700" font-weight="900">0 ₽</tspan></text>
      <image href="${iconGiftB64}" xlink:href="${iconGiftB64}" x="325" y="18" width="90" height="90" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
    </g>

    <!-- Карточка 2: Заморозка при болезни -->
    <g transform="translate(467, 0)">
      <rect width="435" height="126" rx="22" fill="url(#cardConceptGrad)" stroke="#00FFFF" stroke-opacity="0.6" stroke-width="1.8"/>
      <text x="24" y="54" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">Заморозка</text>
      <text x="24" y="90" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">при болезни</text>
      <image href="${iconIceB64}" xlink:href="${iconIceB64}" x="325" y="18" width="90" height="90" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
    </g>

    <!-- Карточка 3: Гос. лицензия -->
    <g transform="translate(0, 146)">
      <rect width="435" height="126" rx="22" fill="url(#cardConceptGrad)" stroke="#00FFFF" stroke-opacity="0.6" stroke-width="1.8"/>
      <text x="24" y="74" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">Гос. лицензия</text>
      <image href="${iconLicenseB64}" xlink:href="${iconLicenseB64}" x="325" y="18" width="90" height="90" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
    </g>

    <!-- Карточка 4: Налоговый вычет 13% -->
    <g transform="translate(467, 146)">
      <rect width="435" height="126" rx="22" fill="url(#cardConceptGrad)" stroke="#00FFFF" stroke-opacity="0.6" stroke-width="1.8"/>
      <text x="24" y="54" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">Налоговый</text>
      <text x="24" y="90" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800">вычет <tspan fill="#FFD700" font-weight="900">13%</tspan></text>
      <image href="${iconTaxB64}" xlink:href="${iconTaxB64}" x="325" y="18" width="90" height="90" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
    </g>
  </g>

  <!-- 5. Подвал (4 адреса) -->
  <g id="06. Подвал (4 Адреса)" transform="translate(55, 1750)" filter="url(#footerShadow)">
    <rect width="902" height="240" rx="26" fill="#05121C" fill-opacity="0.97" stroke="#26C6DA" stroke-width="1.8"/>

    <!-- Левая колонка: Телефоны -->
    <g id="Контакты" transform="translate(30, 44)">
      <circle cx="26" cy="26" r="26" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M34 29.5V32.5C34 33.5 33 34.5 32 34.5C23 34 18 29 17.5 20C17.5 19 18.5 18 19.5 18H22.5C23.5 18 24.3 18.8 24.5 19.8C24.7 21 25.2 22.2 25.9 23.2C26.4 23.9 26.2 24.8 25.5 25.3L24.2 26.3C25.4 28.5 27.5 30.6 29.7 31.8L30.7 30.5C31.2 29.8 32.1 29.6 32.8 30.1C33.8 30.8 35 31.3 36.2 31.5C37.2 31.7 38 32.5 38 33.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

      <text x="74" y="24" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="74" y="58" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
      <text x="74" y="92" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="19" font-weight="600">bugrova.k@bk.ru</text>
    </g>

    <!-- Правая колонка: 4 Адреса -->
    <g id="Адреса Филиалов" transform="translate(485, 38)">
      <circle cx="26" cy="26" r="26" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M26 13C21.5 13 18 16.5 18 21C18 26.5 26 35 26 35C26 35 34 26.5 34 21C34 16.5 30.5 13 26 13Z" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="26" cy="21" r="3.5" fill="#26C6DA"/>

      <text x="74" y="22" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">ул. Большевистская 125,</text>
      <text x="74" y="54" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">ул. Планетная 53,</text>
      <text x="74" y="86" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">ул. Мясниковой 25/2,</text>
      <text x="74" y="118" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="700">ул. Ласковая 18</text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-duo-diagonal-vector.svg'),
  path.resolve(__dirname, '../public/sparta-duo-diagonal-master.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ Sparta Diagonal Concept Vector SVG saved to: ' + p);
}
