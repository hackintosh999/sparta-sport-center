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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-tennis-sunny-bg.png');
const bokehB64 = getBase64('public/banner-assets/sparta-tennis-foreground-bokeh.png');
const netPhotoB64 = getBase64('public/banner-assets/sparta-tennis-net-fill.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');

// 100% FIGMA-EDITABLE VECTOR BANNER (TIGHT PRINT-READY MONOLITHIC COMPOSITION A4)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <!-- Векторная маска заголовка для 100% плотной заливки изображением -->
    <clipPath id="titleTextClip">
      <text x="0" y="135" text-anchor="middle" font-family="'Montserrat', sans-serif" font-size="165" font-weight="900" letter-spacing="2">БОЛЬШОЙ</text>
      <text x="0" y="270" text-anchor="middle" font-family="'Montserrat', sans-serif" font-size="165" font-weight="900" letter-spacing="2">ТЕННИС</text>
    </clipPath>

    <!-- Мягкий градиент в самом низу для кристальной читаемости контактов -->
    <linearGradient id="bottomWhiteMaskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="30%" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="75%" stop-color="#FFFFFF" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.98"/>
    </linearGradient>

    <!-- Темно-зеленый полупрозрачный градиент для плашек (Glassmorphism 90%) -->
    <linearGradient id="badgeGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#132C20" stop-opacity="0.92"/>
      <stop offset="50%" stop-color="#1A3628" stop-opacity="0.90"/>
      <stop offset="100%" stop-color="#2A4E39" stop-opacity="0.86"/>
    </linearGradient>

    <!-- Мягкая внешняя тень для плашек -->
    <filter id="badgeDropShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#0E2117" flood-opacity="0.25"/>
    </filter>

    <!-- Тень для салатовой плашки CTA (#D4FF00) -->
    <filter id="ctaLimeShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#D4FF00" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- ==================== СЛОЙ 1: ЧИСТЫЙ СОЛНЕЧНЫЙ ФОН ==================== -->
  <g id="01. Чистый солнечный фон (Photo)">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice"/>
  </g>

  <!-- ==================== СЛОЙ 2: ПЕРЕДНИЙ ПЛАН (БОКЕ С МЯЧАМИ) ==================== -->
  <g id="02. Передний план (Размытые мячи Боке)" opacity="0.92">
    <image href="${bokehB64}" xlink:href="${bokehB64}" x="0" y="1334" width="1240" height="420" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="1394" width="1240" height="360" fill="url(#bottomWhiteMaskGrad)" id="Мягкое высветление для контактов"/>
  </g>

  <!-- ==================== СЛОЙ 3: ВЕРХНИЙ БЛОК (ЦЕНТРИРОВАНИЕ) ==================== -->
  <g id="03. Шапка Центрированная" transform="translate(620, 65)">
    <!-- 1. Надзаголовок: ЦСП «СПАРТА» -->
    <text x="0" y="32" text-anchor="middle" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="35" font-weight="900" letter-spacing="2" id="ЦСП СПАРТА">
      ЦСП «СПАРТА»
    </text>

    <!-- 2. Подзаголовок: ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ -->
    <text x="0" y="70" text-anchor="middle" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="25" font-weight="700" letter-spacing="3.5" id="ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ">
      ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ
    </text>

    <!-- 3. Золотой Герб SPARTA по центру -->
    <g id="00. Золотой Герб SPARTA" transform="translate(-72, 82)">
      <image href="${crestB64}" xlink:href="${crestB64}" x="0" y="0" width="145" height="145" preserveAspectRatio="xMidYMid meet"/>
    </g>
  </g>

  <!-- ==================== СЛОЙ 4: ГЛАВНЫЙ ЗАГОЛОВОК (100% ПЛОТНЫЙ IMAGE FILL + 3D) ==================== -->
  <g id="04. Главный заголовок (Image Fill + 3D)" transform="translate(620, 325)">
    
    <!-- 1. Задняя жесткая 3D-экструзия (Drop Shadow: X 5, Y 5, Blur 0, #0E2117) -->
    <g id="3D Экструзия (Тень)" transform="translate(5, 5)" fill="#0E2117" font-family="'Montserrat', sans-serif" font-size="165" font-weight="900" letter-spacing="2">
      <text x="0" y="135" text-anchor="middle">БОЛЬШОЙ</text>
      <text x="0" y="270" text-anchor="middle">ТЕННИС</text>
    </g>

    <!-- 2. Лицевой слой: 100% плотная заливка изображением сетки (Clipping Mask) -->
    <g id="Заливка Текстурой (Image Fill)" clip-path="url(#titleTextClip)">
      <rect x="-620" y="0" width="1240" height="380" fill="#122E20"/>
      <image href="${netPhotoB64}" xlink:href="${netPhotoB64}" x="-620" y="0" width="1240" height="380" preserveAspectRatio="xMidYMid slice" opacity="1.0"/>
    </g>

    <!-- 3. Светло-бежевая контурная обводка (Stroke: 3px, #FFFBEB) -->
    <g id="Светлый Контур (Stroke)" font-family="'Montserrat', sans-serif" font-size="165" font-weight="900" letter-spacing="2">
      <text x="0" y="135" text-anchor="middle" fill="none" stroke="#FFFBEB" stroke-width="3" stroke-linejoin="round" id="БОЛЬШОЙ_Stroke">
        БОЛЬШОЙ
      </text>
      <text x="0" y="270" text-anchor="middle" fill="none" stroke="#FFFBEB" stroke-width="3" stroke-linejoin="round" id="ТЕННИС_Stroke">
        ТЕННИС
      </text>
    </g>
  </g>

  <!-- ==================== СЛОЙ 5: УПЛОТНЕННЫЕ ПЛАШКИ-ТРАПЕЦИИ (МОНОЛИТНЫЙ БЛОК GAP: 10px) ==================== -->
  <g id="05. Карточки преимуществ (Плотный Список)" transform="translate(0, 645)">
    
    <!-- Плашка 1: Пробная тренировка 0 ₽ (Ширина 435px, Высота 86px) -->
    <g id="Плашка 1. Пробная тренировка" transform="translate(0, 0)" filter="url(#badgeDropShadow)">
      <polygon points="0,0 435,0 407,86 0,86" fill="url(#badgeGlassGrad)" stroke="rgba(212, 175, 55, 0.70)" stroke-width="1.5"/>
      <text x="145" y="36" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        - Пробная
      </text>
      <text x="145" y="65" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        тренировка 0 ₽
      </text>
    </g>

    <!-- Плашка 2: Заморозка при болезни (Ширина 410px, Gap 10px -> Y=96) -->
    <g id="Плашка 2. Заморозка при болезни" transform="translate(0, 96)" filter="url(#badgeDropShadow)">
      <polygon points="0,0 410,0 382,86 0,86" fill="url(#badgeGlassGrad)" stroke="rgba(212, 175, 55, 0.70)" stroke-width="1.5"/>
      <text x="145" y="36" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        - Заморозка
      </text>
      <text x="145" y="65" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        при болезни
      </text>
    </g>

    <!-- Плашка 3: Гос. лицензия (Ширина 390px, Gap 10px -> Y=192) -->
    <g id="Плашка 3. Гос лицензия" transform="translate(0, 192)" filter="url(#badgeDropShadow)">
      <polygon points="0,0 390,0 362,86 0,86" fill="url(#badgeGlassGrad)" stroke="rgba(212, 175, 55, 0.70)" stroke-width="1.5"/>
      <text x="145" y="36" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        - Гос.
      </text>
      <text x="145" y="65" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        лицензия
      </text>
    </g>

    <!-- Плашка 4: Налоговый вычет 13% (Ширина 440px, Gap 10px -> Y=288) -->
    <g id="Плашка 4. Налоговый вычет" transform="translate(0, 288)" filter="url(#badgeDropShadow)">
      <polygon points="0,0 440,0 412,86 0,86" fill="url(#badgeGlassGrad)" stroke="rgba(212, 175, 55, 0.70)" stroke-width="1.5"/>
      <text x="145" y="36" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        - Налоговый
      </text>
      <text x="145" y="65" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.2">
        вычет 13%
      </text>
    </g>
  </g>

  <!-- ==================== СЛОЙ 6: САЛАТОВАЯ ПЛАШКА CTA (ВПЛОТНУЮ К КАРТОЧКАМ -> Y=1030) ==================== -->
  <g id="06. Салатовая плашка CTA" transform="translate(0, 1030)" filter="url(#ctaLimeShadow)">
    <polygon points="0,0 460,0 428,90 0,90" fill="#D4FF00"/>
    <text x="50" y="40" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="800" letter-spacing="0.3">
      Успейте записаться
    </text>
    <text x="50" y="68" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="800" letter-spacing="0.3">
      на первую тренировку →
    </text>
  </g>

  <!-- ==================== СЛОЙ 7: ПОДВАЛ / КОНТАКТЫ (ПРИЖАТ К САМОМУ НИЗУ) ==================== -->
  <g id="07. Подвал (Контакты)" transform="translate(60, 1545)">
    <!-- Левая колонка: Телефоны -->
    <g id="Контакты Телефоны" transform="translate(0, 0)">
      <circle cx="24" cy="24" r="21" fill="#FFFFFF" fill-opacity="0.85" stroke="#1A3628" stroke-width="2.4"/>
      <path d="M32 27.5V30.5C32 31.5 31 32.5 30 32.5C21 32 16 27 15.5 18C15.5 17 16.5 16 17.5 16H20.5C21.5 16 22.3 16.8 22.5 17.8C22.7 19 23.2 20.2 23.9 21.2C24.4 21.9 24.2 22.8 23.5 23.3L22.2 24.3C23.4 26.5 25.5 28.6 27.7 29.8L28.7 28.5C29.2 27.8 30.1 27.6 30.8 28.1C31.8 28.8 33 29.3 34.2 29.5C35.2 29.7 36 30.5 36 31.5" stroke="#1A3628" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Номера телефонов -->
      <text x="64" y="24" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.3">
        +7 919 339 33 99 - Директор
      </text>
      <text x="64" y="58" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700" letter-spacing="0.3">
        +7 (351) 230-12-69 - Администратор
      </text>
    </g>

    <!-- Правая колонка: Все 4 Адреса Филиалов -->
    <g id="Адреса Филиалов" transform="translate(560, 0)">
      <circle cx="24" cy="24" r="21" fill="#FFFFFF" fill-opacity="0.85" stroke="#1A3628" stroke-width="2.4"/>
      <path d="M24 13C19.5 13 16 16.5 16 21C16 26.5 24 35 24 35C24 35 32 26.5 32 21C32 16.5 28.5 13 24 13Z" stroke="#1A3628" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="24" cy="21" r="3.5" fill="#1A3628"/>
      
      <text x="64" y="20" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.3">
        ул. Ласковая, 18
      </text>
      <text x="64" y="50" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.3">
        ул. Большевистская, 125
      </text>
      <text x="64" y="80" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.3">
        ул. Планетная, 53
      </text>
      <text x="64" y="110" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="700" letter-spacing="0.3">
        ул. Мясниковой, 25/2
      </text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-vector-banner.svg'),
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-poster.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ 100% Tight Monolithic Print-Ready Vector SVG saved to: ' + p);
}
