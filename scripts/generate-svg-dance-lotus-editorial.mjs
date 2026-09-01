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

const bgPhotoB64 = getBase64('public/banner-assets/lotus-editorial-bg.jpg');
const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');
const crestB64 = getBase64('public/banner-assets/lotus-ballet-crest-gold.png');

// 100% FIGMA-EDITABLE & PURE EDITORIAL SWISS BANNER SVG WITH NOBLE GOLD CREST
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <!-- Левый градиент тени -->
    <linearGradient id="ambientLeftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1C2B21" stop-opacity="0.65"/>
      <stop offset="28%" stop-color="#1C2B21" stop-opacity="0.35"/>
      <stop offset="48%" stop-color="#1C2B21" stop-opacity="0"/>
    </linearGradient>

    <!-- Правый зеркальный градиент тени -->
    <linearGradient id="ambientRightGrad" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#1C2B21" stop-opacity="0.55"/>
      <stop offset="25%" stop-color="#1C2B21" stop-opacity="0.30"/>
      <stop offset="46%" stop-color="#1C2B21" stop-opacity="0"/>
    </linearGradient>

    <!-- Мягкий рассеянный контровой свет -->
    <radialGradient id="backlightGlowGrad" cx="55%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FFF8E6" stop-opacity="0.30"/>
      <stop offset="45%" stop-color="#F7D584" stop-opacity="0.10"/>
      <stop offset="80%" stop-color="#F7D584" stop-opacity="0"/>
    </radialGradient>

    <!-- Премиальный темно-изумрудный бархатный градиент для кнопки CTA -->
    <linearGradient id="luxuryDarkBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#23382C"/>
      <stop offset="50%" stop-color="#19281F"/>
      <stop offset="100%" stop-color="#121D16"/>
    </linearGradient>

    <!-- Золотой градиент для иконок -->
    <linearGradient id="goldBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF0CA"/>
      <stop offset="35%" stop-color="#FDE8B3"/>
      <stop offset="85%" stop-color="#D4A853"/>
      <stop offset="100%" stop-color="#B8892E"/>
    </linearGradient>

    <!-- Скругление для внутреннего QR-кода -->
    <clipPath id="qrImgClip">
      <rect x="6" y="6" width="92" height="92" rx="8" ry="8"/>
    </clipPath>
  </defs>

  <!-- ==================== СЛОЙ 1: ФОН, СВЕТ И ДВУСТОРОННИЕ ТЕНИ ==================== -->
  <g id="01. Фон (Stage Photo)">
    <image href="${bgPhotoB64}" xlink:href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice"/>
    <ellipse cx="735" cy="725" rx="375" ry="475" fill="url(#backlightGlowGrad)" id="Мягкий контровой свет"/>
    <rect width="1240" height="1754" fill="url(#ambientLeftGrad)" id="Оливковая тень слева"/>
    <rect width="1240" height="1754" fill="url(#ambientRightGrad)" id="Оливковая тень справа"/>
  </g>

  <!-- ==================== СЛОЙ 2: ПРЕМИАЛЬНАЯ КНОПКА ЗАПИСИ (CTA) ==================== -->
  <g id="02. Кнопка записи (CTA Премиум)" transform="translate(330, 1590)">
    <!-- Тень кнопки -->
    <rect width="580" height="86" rx="43" fill="#0E1611" fill-opacity="0.35" transform="translate(0, 8)"/>
    <!-- Темно-изумрудная плашка с золотым кантом -->
    <rect width="580" height="86" rx="43" fill="url(#luxuryDarkBtnGrad)" stroke="#D4A853" stroke-width="1.8" id="Форма кнопки"/>
    <!-- Центрированный текст: Белый + Золотая стрелка -->
    <text x="290" y="52" text-anchor="middle" font-family="'Montserrat', sans-serif" font-size="20.5" font-weight="800" letter-spacing="2" id="Текст кнопки">
      <tspan fill="#FFFDF9">ЗАПИСАТЬСЯ НА ПРОБНЫЙ УРОК </tspan>
      <tspan fill="#F7D584" font-size="23"> →</tspan>
    </text>
  </g>

  <!-- ==================== СЛОЙ 3: ШАПКА (ГЕРБ ЛЮКС + ЗАГОЛОВОК) ==================== -->
  <g id="03. Шапка (Header)" transform="translate(65, 52)">
    <!-- Золотой Герб Лотоса (Балерина + Лотос) -->
    <g id="00. Золотой Герб LOTOS" transform="translate(0, 0)">
      <image href="${crestB64}" xlink:href="${crestB64}" x="0" y="0" width="62" height="78"/>
    </g>

    <!-- Левый заголовок -->
    <g id="Главный заголовок" transform="translate(0, 92)">
      <text x="0" y="96" fill="#FFFDF9" font-family="'Oswald', sans-serif" font-size="116" font-weight="800" letter-spacing="3" id="ШКОЛА">
        ШКОЛА
      </text>
      <text x="0" y="196" fill="#FFFDF9" font-family="'Oswald', sans-serif" font-size="116" font-weight="800" letter-spacing="3" id="БАЛЕТА">
        БАЛЕТА
      </text>
      <text x="0" y="288" fill="#F7D584" font-family="'Playfair Display', Georgia, serif" font-size="94" font-weight="700" letter-spacing="6" id="LOTOS">
        LOTOS
      </text>
      <text x="0" y="328" fill="#EADCB9" font-family="'Playfair Display', Georgia, serif" font-size="27.5" font-style="italic" font-weight="600" letter-spacing="1" id="Подстрочник">
        «От первых шагов до большой сцены»
      </text>
    </g>

    <!-- Правый блок: НАБОР -->
    <g id="Блок Набор Детей" transform="translate(1110, 24)">
      <text x="0" y="24" text-anchor="end" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="25" font-weight="800" letter-spacing="3" id="Метка Набор">
        НАБОР:
      </text>
      <text x="0" y="76" text-anchor="end" fill="#FFFFFF" font-family="'Oswald', sans-serif" font-size="48" font-weight="800" letter-spacing="2" id="ДЕТЕЙ ОТ 3 ЛЕТ">
        ДЕТЕЙ ОТ 3 ЛЕТ
      </text>
    </g>
  </g>

  <!-- ==================== СЛОЙ 4: ПРЕИМУЩЕСТВА СЛЕВА ==================== -->
  <g id="04. Преимущества (4 пункта)" transform="translate(65, 510)">
    <!-- Пункт 1 -->
    <g transform="translate(0, 0)" id="1. Красивая осанка">
      <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="#F7D584" transform="translate(0, 8) scale(1.3)"/>
      <text x="26" y="22" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">
        КРАСИВАЯ ОСАНКА
      </text>
      <text x="26" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="500">
        Крепкий мышечный корсет и лёгкая походка
      </text>
    </g>

    <!-- Пункт 2 -->
    <g transform="translate(0, 88)" id="2. Бережная растяжка">
      <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="#F7D584" transform="translate(0, 8) scale(1.3)"/>
      <text x="26" y="22" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">
        БЕРЕЖНАЯ РАСТЯЖКА
      </text>
      <text x="26" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="500">
        Развитие природной гибкости без боли и слёз
      </text>
    </g>

    <!-- Пункт 3 -->
    <g transform="translate(0, 176)" id="3. Чувство ритма">
      <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="#F7D584" transform="translate(0, 8) scale(1.3)"/>
      <text x="26" y="22" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">
        ЧУВСТВО РИТМА
      </text>
      <text x="26" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="500">
        Музыкальность, координация и пластика
      </text>
    </g>

    <!-- Пункт 4 -->
    <g transform="translate(0, 264)" id="4. Сценический опыт">
      <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="#F7D584" transform="translate(0, 8) scale(1.3)"/>
      <text x="26" y="22" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">
        СЦЕНИЧЕСКИЙ ОПЫТ
      </text>
      <text x="26" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="500">
        Открытые уроки, костюмы и выступления
      </text>
    </g>
  </g>

  <!-- ==================== СЛОЙ 5: АДРЕСА ФИЛИАЛОВ ==================== -->
  <g id="05. Адреса филиалов (Новосибирск)" transform="translate(65, 1315)">
    <g transform="translate(0, 0)" id="Заголовок адресов">
      <path d="M9 1C5.69 1 3 3.69 3 7C3 11.5 9 17 9 17C9 17 15 11.5 15 7C15 3.69 12.31 1 9 1ZM9 9.2C7.79 9.2 6.8 8.21 6.8 7C6.8 5.79 7.79 4.8 9 4.8C10.21 4.8 11.2 5.79 11.2 7C11.2 8.21 10.21 9.2 9 9.2Z" fill="#F7D584" transform="scale(1.5) translate(0, -2)"/>
      <text x="34" y="18" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="22" font-weight="800" letter-spacing="1.5">
        3 ФИЛИАЛА В НОВОСИБИРСКЕ:
      </text>
    </g>
    <text x="0" y="56" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="20" font-weight="700" id="Адрес Большевистская">
      • ул. Большевистская, 125
    </text>
    <text x="0" y="88" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="20" font-weight="700" id="Адрес Планетная">
      • ул. Планетная, 53
    </text>
    <text x="0" y="120" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="20" font-weight="700" id="Адрес Мясниковой">
      • ул. Мясниковой, 25/2
    </text>
  </g>

  <!-- ==================== СЛОЙ 6: ВЫГОДЫ ДЛЯ РОДИТЕЛЕЙ СПРАВА ==================== -->
  <g id="06. Выгоды для родителей (Смыслы)" transform="translate(1175, 820)">
    
    <!-- Пункт 1: Пробный урок — 0 руб -->
    <g transform="translate(0, 0)" id="1. Пробный урок">
      <text x="0" y="22" text-anchor="end" fill="#F7D584" font-family="'Oswald', sans-serif" font-size="26" font-weight="800" letter-spacing="1.5">
        ПРОБНЫЙ УРОК — 0 ₽
      </text>
      <text x="0" y="52" text-anchor="end" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="19" font-weight="500" letter-spacing="0.3">
        Знакомство с педагогом и методикой школы
      </text>
    </g>

    <!-- Пункт 2: Чуткие педагоги -->
    <g transform="translate(0, 90)" id="2. Чуткие педагоги">
      <text x="0" y="22" text-anchor="end" fill="#F7D584" font-family="'Oswald', sans-serif" font-size="26" font-weight="800" letter-spacing="1.5">
        ЧУТКИЕ ПЕДАГОГИ
      </text>
      <text x="0" y="52" text-anchor="end" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="19" font-weight="500" letter-spacing="0.3">
        Бережный подход к детям без стресса
      </text>
    </g>

    <!-- Пункт 3: Налоговый вычет 13% -->
    <g transform="translate(0, 180)" id="3. Налоговый вычет 13%">
      <text x="0" y="22" text-anchor="end" fill="#F7D584" font-family="'Oswald', sans-serif" font-size="26" font-weight="800" letter-spacing="1.5">
        НАЛОГОВЫЙ ВЫЧЕТ 13%
      </text>
      <text x="0" y="52" text-anchor="end" fill="#FFFDF9" font-family="'Montserrat', sans-serif" font-size="19" font-weight="500" letter-spacing="0.3">
        Наличие государственной лицензии
      </text>
    </g>

  </g>

  <!-- ==================== СЛОЙ 7: КОНТАКТЫ И СМЯГЧЕННЫЙ ГРАФИТОВЫЙ QR ==================== -->
  <g id="07. Контакты и QR" transform="translate(1175, 1285)">
    <text x="0" y="0" text-anchor="end" fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="21" font-weight="800" letter-spacing="2.5" id="Заголовок контактов">
      ЗАПИСЬ И СПРАВКИ:
    </text>

    <!-- Телефон директора -->
    <g transform="translate(0, 38)" id="Телефон Директор">
      <text x="0" y="0" text-anchor="end" font-family="'Oswald', sans-serif" font-size="33" font-weight="700" letter-spacing="1">
        <tspan fill="#FFFFFF">+7 (919) 339-33-99</tspan>
        <tspan fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="16" font-weight="700"> · директор</tspan>
      </text>
    </g>

    <!-- Телефон администратора -->
    <g transform="translate(0, 74)" id="Телефон Администратор">
      <text x="0" y="0" text-anchor="end" font-family="'Oswald', sans-serif" font-size="33" font-weight="700" letter-spacing="1">
        <tspan fill="#FFFFFF">+7 (351) 230-12-69</tspan>
        <tspan fill="#F7D584" font-family="'Montserrat', sans-serif" font-size="16" font-weight="700"> · администратор</tspan>
      </text>
    </g>

    <!-- QR-код (104x104) и VK (56x56) -->
    <g transform="translate(0, 96)" id="QR и VK">
      <!-- Смягченный QR-код (радиус 8px, глубокий хвойный пиксель) -->
      <g transform="translate(-104, 0)" id="Карточка QR">
        <rect width="104" height="104" rx="14" fill="#FFFDF9" stroke="#D4A853" stroke-width="1.8"/>
        <image href="${realQrB64}" xlink:href="${realQrB64}" x="6" y="6" width="92" height="92" clip-path="url(#qrImgClip)"/>
      </g>
      <!-- Знак VK -->
      <g transform="translate(-176, 24)" id="Иконка VK">
        <circle cx="28" cy="28" r="28" fill="url(#goldBtnGrad)"/>
        <path d="M26.29 32.15C17.34 32.15 12.22 26.03 11.99 15.85H16.46C16.63 23.31 19.91 26.46 22.52 27.11V15.85H26.72V22.28C29.31 22 32 19.08 32.92 15.85H37.12C36.41 19.88 33.45 22.8 31.35 24.01C33.45 25.01 36.83 27.52 38.13 32.15H33.51C32.49 28.98 29.97 26.53 26.72 26.21V32.15H26.29Z" fill="#152219" transform="scale(0.92) translate(1, 1)"/>
      </g>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/lotus-editorial-swiss-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated Noble Gold Lotus Crest in LOTOS SVG Header!');
