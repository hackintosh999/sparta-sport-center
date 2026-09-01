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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-football-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const giftB64 = getBase64('public/banner-assets/icon-gift-nobg.png');
const iceB64 = getBase64('public/banner-assets/icon-ice-nobg.png');
const shieldB64 = getBase64('public/banner-assets/icon-license-nobg.png');
const taxB64 = getBase64('public/banner-assets/icon-nalogi-nobg.png');

// 100% FIGMA-EDITABLE VECTOR BANNER (FINAL COMPLETED MASTERPIECE WITH 3D ICONS)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1012" height="2048" viewBox="0 0 1012 2048">
  <defs>
    <!-- Градиент матового сияющего стекла для плашек (White 28% -> Navy 12%) -->
    <linearGradient id="glassCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.28"/>
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#041834" stop-opacity="0.12"/>
    </linearGradient>

    <!-- Неоновое свечение Cyan #00FFFF для карточек преимуществ -->
    <filter id="cyanGlowCard" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#00FFFF" flood-opacity="0.40"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.50"/>
    </filter>

    <!-- Тень для выступающих 3D иконок -->
    <filter id="iconDropShadow" x="-25%" y="-25%" width="150%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#00FFFF" flood-opacity="0.25"/>
    </filter>

    <!-- Тень для плавающих пьедесталов -->
    <filter id="pedestalShadow" x="-25%" y="-25%" width="150%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000000" flood-opacity="0.70"/>
    </filter>

    <!-- Плотная тень для белого заголовка ЦСП СПАРТА -->
    <filter id="whiteHeaderShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.95"/>
    </filter>

    <!-- Тень для подвала -->
    <filter id="footerShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#00FFFF" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- ==================== СЛОЙ 1: БАЗОВЫЙ ЧИСТЫЙ ФОН ==================== -->
  <g id="01. Базовый чистый фон (Photo)">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1012" height="2048" preserveAspectRatio="xMidYMid slice"/>
  </g>

  <!-- ==================== СЛОЙ 2: ПЛАВАЮЩИЕ 3D-ПЬЕДЕСТАЛЫ В СЦЕНЕ ==================== -->
  <g id="02. Плавающие 3D-Пьедесталы">
    <!-- Плавающий Подарок вверху слева -->
    <g id="Пьедестал Подарок" transform="translate(70, 360)" filter="url(#pedestalShadow)">
      <image href="${giftB64}" xlink:href="${giftB64}" x="0" y="0" width="360" height="380" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <!-- Плавающий Лед под ногой мальчика -->
    <g id="Пьедестал Лед" transform="translate(285, 610)" filter="url(#pedestalShadow)">
      <image href="${iceB64}" xlink:href="${iceB64}" x="0" y="0" width="320" height="340" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <!-- Плавающий Щит справа от заголовка -->
    <g id="Пьедестал Щит" transform="translate(620, 860)" filter="url(#pedestalShadow)">
      <image href="${shieldB64}" xlink:href="${shieldB64}" x="0" y="0" width="370" height="390" preserveAspectRatio="xMidYMid meet"/>
    </g>
  </g>

  <!-- ==================== СЛОЙ 3: ШАПКА МАКЕТА В ЛЕВОМ ВЕРХНЕМ УГЛУ ==================== -->
  <g id="03. Шапка (Top Left)" transform="translate(65, 45)">
    <!-- Золотой логотип SPARTA -->
    <g id="Золотой Логотип SPARTA" transform="translate(0, 0)">
      <image href="${crestB64}" xlink:href="${crestB64}" x="0" y="0" width="140" height="140" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Текст: ЦСП «СПАРТА» под логотипом -->
    <text x="70" y="175" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="28" font-weight="800" letter-spacing="1.5" filter="url(#whiteHeaderShadow)" id="ЦСП СПАРТА Верхний">
      ЦСП «СПАРТА»
    </text>
  </g>

  <!-- ==================== СЛОЙ 4: ГЛАВНЫЙ ЗАГОЛОВОК (8-СЛОЙНАЯ 3D-ЭКСТРУЗИЯ #5A0000) ==================== -->
  <g id="04. Главный 3D Заголовок (Экструзия)" transform="translate(65, 870)">

    <!-- Группа 3D букв СТАНЬ ЧАСТЬЮ КОМАНДЫ! -->
    <g id="СТАНЬ ЧАСТЬЮ КОМАНДЫ 3D" transform="translate(0, 0)" font-family="'Montserrat', sans-serif" font-size="125" font-weight="900" letter-spacing="1.5">
      
      <!-- Серия из 8 слоев жесткой бордовой экструзии (X 0, Y 1..8, #5A0000 / #3A0000) -->
      <g id="Слой Экструзии Y8" transform="translate(0, 8)" fill="#2A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y7" transform="translate(0, 7)" fill="#3A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y6" transform="translate(0, 6)" fill="#4A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y5" transform="translate(0, 5)" fill="#4A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y4" transform="translate(0, 4)" fill="#5A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y3" transform="translate(0, 3)" fill="#5A0000">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y2" transform="translate(0, 2)" fill="#6A0505">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>
      <g id="Слой Экструзии Y1" transform="translate(0, 1)" fill="#7A0A0A">
        <text x="0" y="115">СТАНЬ</text><text x="0" y="235">ЧАСТЬЮ</text><text x="0" y="355">КОМАНДЫ!</text>
      </g>

      <!-- Лицевой слой: Насыщенный матовый красный (#EB3B3B) -->
      <g id="Лицевой Красный Текст" fill="#EB3B3B">
        <text x="0" y="115" id="СТАНЬ">СТАНЬ</text>
        <text x="0" y="235" id="ЧАСТЬЮ">ЧАСТЬЮ</text>
        <text x="0" y="355" id="КОМАНДЫ!">КОМАНДЫ!</text>
      </g>

      <!-- Тонкий светлый верхний блик по граням букв (Inner Highlight) -->
      <g id="Верхний Блик (Stroke 1px White 35%)" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.2">
        <text x="0" y="115">СТАНЬ</text>
        <text x="0" y="235">ЧАСТЬЮ</text>
        <text x="0" y="355">КОМАНДЫ!</text>
      </g>
    </g>
  </g>

  <!-- ==================== СЛОЙ 5: КАРТОЧКИ ПРЕИМУЩЕСТВ С ВЫСТУПАЮЩИМИ 3D-ИКОНКАМИ (2x2) ==================== -->
  <g id="05. Карточки преимуществ с 3D Иконками" transform="translate(65, 1420)">
    
    <!-- Карточка 1 (Верхний левый угол): Пробная тренировка 0 ₽ (Подарок-мяч) -->
    <g id="Карточка 1. Пробная тренировка" transform="translate(0, 0)">
      <!-- Стеклянная плашка с Bevel -->
      <g filter="url(#cyanGlowCard)">
        <rect width="428" height="120" rx="20" fill="url(#glassCardGrad)" stroke="#00FFFF" stroke-width="1.2"/>
        <path d="M 20 1.2 L 408 1.2" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 20 118.8 L 408 118.8" stroke="#000C18" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>
      </g>
      <!-- Текст -->
      <text x="24" y="50" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        Пробная
      </text>
      <text x="24" y="84" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        тренировка 0 ₽
      </text>
      <!-- Выступающая 3D-иконка подарка (на 46px выше края) -->
      <g id="3D Иконка Подарок" transform="translate(285, -46)" filter="url(#iconDropShadow)">
        <image href="${giftB64}" xlink:href="${giftB64}" x="0" y="0" width="125" height="140" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>

    <!-- Карточка 2 (Верхний правый угол): Заморозка при болезни (Ледяной кубик) -->
    <g id="Карточка 2. Заморозка при болезни" transform="translate(454, 0)">
      <g filter="url(#cyanGlowCard)">
        <rect width="428" height="120" rx="20" fill="url(#glassCardGrad)" stroke="#00FFFF" stroke-width="1.2"/>
        <path d="M 20 1.2 L 408 1.2" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 20 118.8 L 408 118.8" stroke="#000C18" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>
      </g>
      <text x="24" y="50" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        Заморозка
      </text>
      <text x="24" y="84" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        при болезни
      </text>
      <!-- Выступающая 3D-иконка льда (на 42px выше края) -->
      <g id="3D Иконка Лед" transform="translate(285, -42)" filter="url(#iconDropShadow)">
        <image href="${iceB64}" xlink:href="${iceB64}" x="0" y="0" width="125" height="135" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>

    <!-- Карточка 3 (Нижний левый угол): Гос. лицензия (Золотой щит) -->
    <g id="Карточка 3. Гос лицензия" transform="translate(0, 146)">
      <g filter="url(#cyanGlowCard)">
        <rect width="428" height="120" rx="20" fill="url(#glassCardGrad)" stroke="#00FFFF" stroke-width="1.2"/>
        <path d="M 20 1.2 L 408 1.2" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 20 118.8 L 408 118.8" stroke="#000C18" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>
      </g>
      <text x="24" y="68" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        Гос. лицензия
      </text>
      <!-- Выступающая 3D-иконка золотого щита (на 38px выше края) -->
      <g id="3D Иконка Щит" transform="translate(285, -38)" filter="url(#iconDropShadow)">
        <image href="${shieldB64}" xlink:href="${shieldB64}" x="0" y="0" width="120" height="135" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>

    <!-- Карточка 4 (Нижний правый угол): Налоговый вычет 13% (Монеты и график) -->
    <g id="Карточка 4. Налоговый вычет" transform="translate(454, 146)">
      <g filter="url(#cyanGlowCard)">
        <rect width="428" height="120" rx="20" fill="url(#glassCardGrad)" stroke="#00FFFF" stroke-width="1.2"/>
        <path d="M 20 1.2 L 408 1.2" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 20 118.8 L 408 118.8" stroke="#000C18" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>
      </g>
      <text x="24" y="50" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        Налоговый
      </text>
      <text x="24" y="84" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="24" font-weight="700" letter-spacing="0.2">
        вычет 13%
      </text>
      <!-- Выступающая 3D-иконка налогов и монет (на 38px выше края) -->
      <g id="3D Иконка Налоги" transform="translate(275, -38)" filter="url(#iconDropShadow)">
        <image href="${taxB64}" xlink:href="${taxB64}" x="0" y="0" width="145" height="135" preserveAspectRatio="xMidYMid meet"/>
      </g>
    </g>
  </g>

  <!-- ==================== СЛОЙ 6: ПОДВАЛ (ТЕМНАЯ ПАНЕЛЬ С КОНТАКТАМИ И ВСЕМИ 4 АДРЕСАМИ) ==================== -->
  <g id="06. Подвал (Контакты)" transform="translate(40, 1775)" filter="url(#footerShadow)">
    <rect width="932" height="235" rx="28" fill="#051326" fill-opacity="0.94" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1.5"/>

    <!-- Левая колонка: Телефоны и Email -->
    <g id="Контакты Телефоны" transform="translate(36, 38)">
      <circle cx="22" cy="22" r="22" fill="rgba(0, 255, 255, 0.15)" stroke="#00FFFF" stroke-width="1.8"/>
      <path d="M30 25.5V28.5C30 29.5 29 30.5 28 30.5C19 30 14 25 13.5 16C13.5 15 14.5 14 15.5 14H18.5C19.5 14 20.3 14.8 20.5 15.8C20.7 17 21.2 18.2 21.9 19.2C22.4 19.9 22.2 20.8 21.5 21.3L20.2 22.3C21.4 24.5 23.5 26.6 25.7 27.8L26.7 26.5C27.2 25.8 28.1 25.6 28.8 26.1C29.8 26.8 31 27.3 32.2 27.5C33.2 27.7 34 28.5 34 29.5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      
      <text x="62" y="24" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        +7 919 339 33 99,
      </text>
      <text x="62" y="58" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        +7 (351) 230-12-69
      </text>
      <text x="62" y="92" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        bugrova.k@bk.ru
      </text>
    </g>

    <!-- Правая колонка: Все адреса филиалов -->
    <g id="Адреса Филиалов" transform="translate(480, 38)">
      <circle cx="22" cy="22" r="22" fill="rgba(0, 255, 255, 0.15)" stroke="#00FFFF" stroke-width="1.8"/>
      <path d="M22 11C17.5 11 14 14.5 14 19C14 24.5 22 33 22 33C22 33 30 24.5 30 19C30 14.5 26.5 11 22 11Z" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="22" cy="19" r="3.5" fill="#00FFFF"/>

      <text x="62" y="22" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        ул. Большевистская 125,
      </text>
      <text x="62" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        ул. Планетная 53,
      </text>
      <text x="62" y="82" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        ул. Мясниковой 25/2,
      </text>
      <text x="62" y="112" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="600" letter-spacing="0.2">
        ул. Ласковая 18
      </text>
    </g>
  </g>
</svg>
`;

const paths = [
  path.resolve(__dirname, '../public/banner-assets/sparta-football-vector-banner.svg'),
  path.resolve(__dirname, '../public/sparta-football-poster.svg')
];

for (const p of paths) {
  fs.writeFileSync(p, svgContent, 'utf-8');
  console.log('✅ 100% Final Master Vector SVG with 3D Icons saved to: ' + p);
}
