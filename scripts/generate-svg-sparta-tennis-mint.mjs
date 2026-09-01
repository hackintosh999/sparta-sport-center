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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-tennis-girl-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const iconGiftB64 = getBase64('public/banner-assets/tennis-icon-gift.png');
const iconIceB64 = getBase64('public/banner-assets/tennis-icon-ice.png');
const iconLicenseB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const iconTaxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

// 100% FIGMA-NATIVE COMPATIBLE VECTOR SVG (3 ADDRESSES • НОВОЕ НАПРАВЛЕНИЕ • ZERO BLACK TEXT BUG)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1012" height="2048" viewBox="0 0 1012 2048">
  <defs>
    <!-- Градиент для 3D-плит преимуществ: Светло-мятный -> Нежный фиолетово-сиреневый -->
    <linearGradient id="plateMintLavenderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7EFBD0" stop-opacity="0.88"/>
      <stop offset="38%" stop-color="#64DCD7" stop-opacity="0.84"/>
      <stop offset="100%" stop-color="#B589D6" stop-opacity="0.88"/>
    </linearGradient>

    <!-- Мягкая внешняя тень подложки для плит -->
    <filter id="pillShadow" x="-15%" y="-20%" width="130%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000000" flood-opacity="0.45"/>
    </filter>

    <!-- Тень для 3D-иконок -->
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.45"/>
    </filter>

    <!-- Тень для подвала -->
    <filter id="footerShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#26C6DA" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- ==================== СЛОЙ 1: БАЗОВЫЙ ЧИСТЫЙ ФОН ==================== -->
  <g id="01. Базовый чистый фон">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1012" height="2048" preserveAspectRatio="xMidYMid slice"/>
  </g>

  <!-- ==================== СЛОЙ 2: ШАПКА С КРУПНЫМ ЗОЛОТЫМ ГЕРБОМ ==================== -->
  <g id="02. Шапка (Верхний текст)" transform="translate(506, 24)">
    <image href="${crestB64}" xlink:href="${crestB64}" x="-70" y="0" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>
    <text x="0" y="165" text-anchor="middle" fill="#0B4E49" font-family="'Montserrat', sans-serif" font-size="28" font-weight="900" letter-spacing="1.8" id="ЦСП СПАРТА ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ">
      ЦСП «СПАРТА» ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ:
    </text>
  </g>

  <!-- ==================== СЛОЙ 3: ГИГАНТСКИЙ 3D ЗАГОЛОВОК (ФИГМА-СОВМЕСТИМЫЙ МЯТНЫЙ ЦВЕТ) ==================== -->
  <g id="03. Главный 3D Заголовок (БОЛЬШОЙ ТЕННИС)" transform="translate(506, 205)" font-family="'Montserrat', sans-serif" font-size="154" font-weight="900" letter-spacing="2">
    
    <!-- 3D-Экструзия: серия слоев цвета темно-бирюзового #0F4D52 (Y 2..8) -->
    <g id="Экструзия Y8" transform="translate(0, 8)" fill="#052123"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y7" transform="translate(0, 7)" fill="#06282B"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y6" transform="translate(0, 6)" fill="#083033"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y5" transform="translate(0, 5)" fill="#09373B"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y4" transform="translate(0, 4)" fill="#0B3E42"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y3" transform="translate(0, 3)" fill="#0D454A"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>
    <g id="Экструзия Y2" transform="translate(0, 2)" fill="#0F4D52"><text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="275" text-anchor="middle">ТЕННИС</text></g>

    <!-- Лицевой слой: Прямой чистый мятно-белый цвет (#E0FFF8 с обводкой #FFFFFF) -->
    <g id="Лицевой Текст" fill="#E0FFF8" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round">
      <text x="0" y="135" text-anchor="middle" id="БОЛЬШОЙ">БОЛЬШОЙ</text>
      <text x="0" y="275" text-anchor="middle" id="ТЕННИС">ТЕННИС</text>
    </g>
  </g>

  <!-- ==================== СЛОЙ 4: МАССИВНЫЕ 3D-ПЛИТЫ С ЧЕТКИМ 3D-ТЕКСТОМ (650x136px) ==================== -->
  <g id="04. Карточки-плиты 3D с Иконками" transform="translate(196, 1025)" filter="url(#pillShadow)">
    
    <!-- 1. Пробная тренировка 0 ₽ -->
    <g id="Плита 1. Пробная тренировка" transform="translate(0, 0)">
      <rect x="0" y="11" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="#053A34"/>
      <rect x="0" y="0" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="url(#plateMintLavenderGrad)" stroke="#FFFFFF" stroke-width="1.8"/>
      <!-- 3D Icon: Подарочная коробка -->
      <image href="${iconGiftB64}" xlink:href="${iconGiftB64}" x="14" y="15" width="106" height="106" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      
      <!-- 3D Тень текста (#2A0845) -->
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2" transform="translate(2, 3)">
        <text x="152" y="60">Пробная</text>
        <text x="152" y="98">тренировка 0 ₽</text>
      </g>
      <!-- Лицевой текст (Чистый Белый #FFFFFF) -->
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2">
        <text x="152" y="60">Пробная</text>
        <text x="152" y="98">тренировка 0 ₽</text>
      </g>
    </g>

    <!-- 2. Заморозка при болезни (Gap 16px -> Y=152) -->
    <g id="Плита 2. Заморозка при болезни" transform="translate(0, 152)">
      <rect x="0" y="11" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="#053A34"/>
      <rect x="0" y="0" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="url(#plateMintLavenderGrad)" stroke="#FFFFFF" stroke-width="1.8"/>
      <!-- 3D Icon: Кубик льда -->
      <image href="${iconIceB64}" xlink:href="${iconIceB64}" x="14" y="15" width="106" height="106" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2" transform="translate(2, 3)">
        <text x="152" y="60">Заморозка</text>
        <text x="152" y="98">при болезни</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2">
        <text x="152" y="60">Заморозка</text>
        <text x="152" y="98">при болезни</text>
      </g>
    </g>

    <!-- 3. Гос. лицензия (Gap 16px -> Y=304) -->
    <g id="Плита 3. Гос лицензия" transform="translate(0, 304)">
      <rect x="0" y="11" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="#053A34"/>
      <rect x="0" y="0" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="url(#plateMintLavenderGrad)" stroke="#FFFFFF" stroke-width="1.8"/>
      <!-- 3D Icon: Золотой щит -->
      <image href="${iconLicenseB64}" xlink:href="${iconLicenseB64}" x="14" y="15" width="106" height="106" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2" transform="translate(2, 3)">
        <text x="152" y="80">Гос. лицензия</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2">
        <text x="152" y="80">Гос. лицензия</text>
      </g>
    </g>

    <!-- 4. Налоговый вычет 13% (Gap 16px -> Y=456) -->
    <g id="Плита 4. Налоговый вычет" transform="translate(0, 456)">
      <rect x="0" y="11" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="#053A34"/>
      <rect x="0" y="0" width="650" height="136" rx="22" ry="22" transform="skewX(-15)" fill="url(#plateMintLavenderGrad)" stroke="#FFFFFF" stroke-width="1.8"/>
      <!-- 3D Icon: 13% Монеты -->
      <image href="${iconTaxB64}" xlink:href="${iconTaxB64}" x="14" y="15" width="106" height="106" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
      
      <g fill="#2A0845" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2" transform="translate(2, 3)">
        <text x="152" y="60">Налоговый</text>
        <text x="152" y="98">вычет 13%</text>
      </g>
      <g fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="31" font-weight="900" letter-spacing="0.2">
        <text x="152" y="60">Налоговый</text>
        <text x="152" y="98">вычет 13%</text>
      </g>
    </g>
  </g>

  <!-- ==================== СЛОЙ 5: ПОДВАЛ (ТЕМНО-БИРЮЗОВЫЙ С 3 АДРЕСАМИ) ==================== -->
  <g id="05. Подвал (Контакты)" transform="translate(45, 1765)" filter="url(#footerShadow)">
    <rect width="922" height="238" rx="28" fill="#082B28" fill-opacity="0.96" stroke="#26C6DA" stroke-width="1.8"/>

    <!-- Левая колонка: Телефоны с должностями -->
    <g id="Контакты Телефоны" transform="translate(36, 48)">
      <circle cx="24" cy="24" r="24" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M32 27.5V30.5C32 31.5 31 32.5 30 32.5C21 32 16 27 15.5 18C15.5 17 16.5 16 17.5 16H20.5C21.5 16 22.3 16.8 22.5 17.8C22.7 19 23.2 20.2 23.9 21.2C24.4 21.9 24.2 22.8 23.5 23.3L22.2 24.3C23.4 26.5 25.5 28.6 27.7 29.8L28.7 28.5C29.2 27.8 30.1 27.6 30.8 28.1C31.8 28.8 33 29.3 34.2 29.5C35.2 29.7 36 30.5 36 31.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      
      <text x="68" y="22" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.2">
        +7 919 339 33 99 (Директор)
      </text>
      <text x="68" y="60" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.2">
        +7 (351) 230-12-69 (Администратор)
      </text>
    </g>

    <!-- Правая колонка: Ровно 3 адреса филиалов (СТРОГО БЕЗ Ласковой 18) -->
    <g id="Адреса Филиалов" transform="translate(520, 40)">
      <circle cx="24" cy="24" r="24" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M24 13C19.5 13 16 16.5 16 21C16 26.5 24 35 24 35C24 35 32 26.5 32 21C32 16.5 28.5 13 24 13Z" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="24" cy="21" r="3.5" fill="#26C6DA"/>

      <text x="68" y="20" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.2">
        ул. Большевистская 125,
      </text>
      <text x="68" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.2">
        ул. Планетная 53,
      </text>
      <text x="68" y="84" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.2">
        ул. Мясниковой 25/2
      </text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-mint-vector-banner.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-mint-poster.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ 100% Updated SVG (НОВОЕ НАПРАВЛЕНИЕ + 3 Addresses) saved to: ' + p);
}
