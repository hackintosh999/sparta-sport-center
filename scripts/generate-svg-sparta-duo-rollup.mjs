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

const bgTennisB64 = getBase64('public/banner-assets/sparta-tennis-girl-clean-bg.jpg');
const bgFootballB64 = getBase64('public/banner-assets/sparta-football-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');

const iconGiftB64 = getBase64('public/banner-assets/icon-gift-nobg.png');
const iconIceB64 = getBase64('public/banner-assets/icon-ice-nobg.png');
const iconLicenseB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const iconTaxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

// 100% FIGMA-NATIVE MASTER VECTOR SVG: UNIFIED DUO ROLLUP 100x200 CM
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1012" height="2048" viewBox="0 0 1012 2048">
  <defs>
    <!-- Диагональные маски для левой (футбол) и правой (теннис) половин -->
    <clipPath id="clipLeftFootball">
      <polygon points="0,0 540,0 460,1400 0,1400"/>
    </clipPath>
    <clipPath id="clipRightTennis">
      <polygon points="540,0 1012,0 1012,1400 460,1400"/>
    </clipPath>

    <!-- Градиент затемнения к подвалу -->
    <linearGradient id="fadeBottomDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#041017" stop-opacity="0"/>
      <stop offset="35%" stop-color="#041017" stop-opacity="0.92"/>
      <stop offset="70%" stop-color="#041017" stop-opacity="1"/>
      <stop offset="100%" stop-color="#041017" stop-opacity="1"/>
    </linearGradient>

    <!-- Градиент неонового шва -->
    <linearGradient id="seamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF1A1A"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#00FFFF"/>
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

  <!-- ==================== 01. ФОНОВЫЙ СЛОЙ ==================== -->
  <g id="01. Фоновый слой (Дуэт)">
    <!-- Базовый темный фон -->
    <rect width="1012" height="2048" fill="#041017"/>

    <!-- Левая половина (Футбол) -->
    <g clip-path="url(#clipLeftFootball)">
      <image href="${bgFootballB64}" xlink:href="${bgFootballB64}" x="-220" y="0" width="1012" height="1400" preserveAspectRatio="xMidYMid slice"/>
    </g>

    <!-- Правая половина (Теннис) -->
    <g clip-path="url(#clipRightTennis)">
      <image href="${bgTennisB64}" xlink:href="${bgTennisB64}" x="180" y="0" width="1012" height="1400" preserveAspectRatio="xMidYMid slice"/>
    </g>

    <!-- Энергетический шов между футболом и теннисом -->
    <g id="Энергетический шов">
      <line x1="540" y1="0" x2="460" y2="1400" stroke="#FF1A1A" stroke-width="8" opacity="0.35"/>
      <line x1="540" y1="0" x2="460" y2="1400" stroke="#00FFFF" stroke-width="6" opacity="0.45"/>
      <line x1="540" y1="0" x2="460" y2="1400" stroke="url(#seamGrad)" stroke-width="3.5"/>
      <line x1="540" y1="0" x2="460" y2="1400" stroke="#FFFFFF" stroke-width="1.5" opacity="0.9"/>
    </g>

    <!-- Плавное затемнение к низу -->
    <rect y="1050" width="1012" height="998" fill="url(#fadeBottomDark)"/>
  </g>

  <!-- ==================== 02. ЕДИНАЯ ЦАРСКАЯ ШАПКА ==================== -->
  <g id="02. Шапка ЦСП СПАРТА" transform="translate(506, 28)">
    <!-- Крупный золотой герб со львом -->
    <image href="${crestB64}" xlink:href="${crestB64}" x="-62" y="0" width="125" height="125" preserveAspectRatio="xMidYMid meet"/>
    
    <!-- Название бренда -->
    <text x="0" y="165" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="38" font-weight="900" letter-spacing="3">
      ЦСП «СПАРТА»
    </text>

    <!-- Табличка набора -->
    <g transform="translate(0, 182)">
      <rect x="-260" y="0" width="520" height="42" rx="21" fill="#00FFFF" fill-opacity="0.15" stroke="#00FFFF" stroke-width="1.6"/>
      <text x="0" y="28" text-anchor="middle" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="22" font-weight="800" letter-spacing="2">
        ОТКРЫВАЕТ НАБОР ДЕТЕЙ И ВЗРОСЛЫХ:
      </text>
    </g>
  </g>

  <!-- ==================== 03. БЕЙДЖИ НАПРАВЛЕНИЙ ==================== -->
  <g id="03. Бейджи направлений" transform="translate(0, 275)">
    <!-- Бейдж Футбол (Слева) -->
    <g transform="translate(55, 0)">
      <rect width="280" height="66" rx="20" fill="#FF1A1A" stroke="#FFE5E5" stroke-width="2"/>
      <text x="140" y="46" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="34" font-weight="900" letter-spacing="1.5">
        ⚽ ФУТБОЛ
      </text>
    </g>

    <!-- Бейдж Теннис (Справа) -->
    <g transform="translate(555, 0)">
      <rect width="400" height="66" rx="20" fill="#2ED1C6" stroke="#E0FFF8" stroke-width="2"/>
      <text x="200" y="46" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="32" font-weight="900" letter-spacing="1.5">
        🎾 БОЛЬШОЙ ТЕННИС
      </text>
    </g>
  </g>

  <!-- ==================== 04. ЕДИНЫЙ БЛОК 4 ПРЕИМУЩЕСТВ (2x2 GRID) ==================== -->
  <g id="04. Карточки преимуществ" transform="translate(45, 1260)">
    
    <!-- Заголовок блока преимуществ -->
    <text x="461" y="0" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900" letter-spacing="2">
      ПРЕИМУЩЕСТВА ЦЕНТРА <tspan fill="#00FFFF">СПАРТА</tspan>
    </text>

    <!-- Сетка 2x2 -->
    <g transform="translate(0, 25)">
      
      <!-- Карточка 1: Пробная тренировка 0 ₽ -->
      <g transform="translate(0, 0)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#FFD700" stroke-width="2"/>
        <image href="${iconGiftB64}" xlink:href="${iconGiftB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Пробная</text>
        <text x="116" y="88" fill="#FFD700" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">тренировка 0 ₽</text>
      </g>

      <!-- Карточка 2: Заморозка при болезни -->
      <g transform="translate(477, 0)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#26C6DA" stroke-width="2"/>
        <image href="${iconIceB64}" xlink:href="${iconIceB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Заморозка</text>
        <text x="116" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">при болезни</text>
      </g>

      <!-- Карточка 3: Гос. лицензия -->
      <g transform="translate(0, 138)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#26C6DA" stroke-width="2"/>
        <image href="${iconLicenseB64}" xlink:href="${iconLicenseB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Государственная</text>
        <text x="116" y="88" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">лицензия</text>
      </g>

      <!-- Карточка 4: Налоговый вычет 13% -->
      <g transform="translate(477, 138)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#FFD700" stroke-width="2"/>
        <image href="${iconTaxB64}" xlink:href="${iconTaxB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Налоговый</text>
        <text x="116" y="88" fill="#FFD700" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">вычет 13%</text>
      </g>

    </g>
  </g>

  <!-- ==================== 05. ЕДИНЫЙ ПОДВАЛ (4 АДРЕСА) ==================== -->
  <g id="05. Единый Подвал" transform="translate(45, 1740)" filter="url(#footerShadow)">
    <rect width="922" height="255" rx="26" fill="#04121A" fill-opacity="0.98" stroke="#26C6DA" stroke-width="2"/>

    <!-- Левая колонка: Телефоны + Email -->
    <g id="Контакты" transform="translate(30, 48)">
      <circle cx="27" cy="27" r="27" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M35 30.5V33.5C35 34.5 34 35.5 33 35.5C24 35 19 30 18.5 21C18.5 20 19.5 19 20.5 19H23.5C24.5 19 25.3 19.8 25.5 20.8C25.7 22 26.2 23.2 26.9 24.2C27.4 24.9 27.2 25.8 26.5 26.3L25.2 27.3C26.4 29.5 28.5 31.6 30.7 32.8L31.7 31.5C32.2 30.8 33.1 30.6 33.8 31.1C34.8 31.8 36 32.3 37.2 32.5C38.2 32.7 39 33.5 39 34.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

      <text x="76" y="26" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="76" y="60" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
      <text x="76" y="94" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="600">bugrova.k@bk.ru</text>
    </g>

    <!-- Правая колонка: 4 Адреса -->
    <g id="Адреса Филиалов" transform="translate(505, 42)">
      <circle cx="27" cy="27" r="27" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M27 14C22.5 14 19 17.5 19 22C19 27.5 27 36 27 36C27 36 35 27.5 35 22C35 17.5 31.5 14 27 14Z" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="27" cy="22" r="3.5" fill="#26C6DA"/>

      <text x="76" y="24" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">ул. Большевистская 125,</text>
      <text x="76" y="56" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">ул. Планетная 53,</text>
      <text x="76" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">ул. Мясниковой 25/2,</text>
      <text x="76" y="120" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">ул. Ласковая 18</text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-duo-rollup-vector.svg'),
  path.resolve(__dirname, '../public/sparta-duo-rollup-master.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ Sparta Unified Duo Rollup Vector SVG saved to: ' + p);
}
