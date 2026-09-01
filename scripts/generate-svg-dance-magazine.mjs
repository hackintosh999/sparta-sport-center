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

const bgPhotoB64 = getBase64('public/banner-assets/dance-kids-hero-split.jpg');
const iconBalletB64 = getBase64('public/banner-assets/icon-3d-ballet.png');
const iconStretchB64 = getBase64('public/banner-assets/icon-3d-stretch.png');
const iconRhythmB64 = getBase64('public/banner-assets/icon-3d-rhythm.png');
const iconLightningB64 = getBase64('public/banner-assets/icon-3d-lightning.png');
const iconSneakerB64 = getBase64('public/banner-assets/icon-3d-sneaker.png');
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

    <!-- Glass & Contact Shadow Filters -->
    <filter id="contactShadowBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="ambientShadowBlur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>

    <filter id="tagShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.07"/>
    </filter>
    <filter id="guaranteeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
    <filter id="btnShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#D4A853" flood-opacity="0.5"/>
    </filter>
    <filter id="sparkleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#E5B25D" flood-opacity="0.8"/>
    </filter>

    <!-- Gradients -->
    <linearGradient id="badgeLotusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#284B35" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="#183222" stop-opacity="0.98"/>
    </linearGradient>

    <linearGradient id="badgeSomaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3E3458" stop-opacity="0.94"/>
      <stop offset="100%" stop-color="#28203C" stop-opacity="0.98"/>
    </linearGradient>

    <linearGradient id="goldBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2B866"/>
      <stop offset="50%" stop-color="#D4A853"/>
      <stop offset="100%" stop-color="#C49642"/>
    </linearGradient>

    <linearGradient id="topLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.94"/>
      <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.70"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="contactShadowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1E2229" stop-opacity="0.5"/>
      <stop offset="75%" stop-color="#1E2229" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 0. ФОН: ЗАЛ С ДЕТЬМИ -->
  <g id="0. Фон (Background)">
    <image href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice"/>

    <!-- 2. СЛОВО DANCE ЗА СПИНАМИ ДЕТЕЙ (3D-ОБЪЕМ) -->
    <text x="620" y="740" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.20" stroke="#FFFFFF" stroke-opacity="0.40" stroke-width="2.5" font-family="'Unbounded', Montserrat, sans-serif" font-size="190" font-weight="900" letter-spacing="30">
      DANCE
    </text>

    <!-- Тени на паркете -->
    <g id="Тени под стопами">
      <ellipse cx="575" cy="1232" rx="40" ry="7" fill="url(#contactShadowGrad)" filter="url(#contactShadowBlur)"/>
      <ellipse cx="755" cy="1226" rx="42" ry="7" fill="url(#contactShadowGrad)" filter="url(#contactShadowBlur)"/>
    </g>

    <!-- Верхний световой рассеиватель -->
    <rect width="1240" height="480" fill="url(#topLightGrad)"/>
  </g>

  <!-- 1. ШАПКА: КОНТРАСТНАЯ ТИПОГРАФИКА -->
  <g id="1. Шапка (Header)" transform="translate(60, 38)">
    <!-- Тонкие орбиты -->
    <g id="Орбиты">
      <ellipse cx="560" cy="180" rx="380" ry="145" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5" transform="rotate(-7 560 180)"/>
      <ellipse cx="560" cy="180" rx="490" ry="185" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.5" transform="rotate(5 560 180)"/>
    </g>

    <!-- Надзаголовок -->
    <g id="Пилюля" transform="translate(320, 0)">
      <rect width="480" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="1.5"/>
      <line x1="340" y1="2" x2="780" y2="2" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.8"/>
      <text x="240" y="27" text-anchor="middle" fill="#1E2229" font-family="Montserrat, sans-serif" font-size="13.5" font-weight="800" letter-spacing="2">
        ВСЕРОССИЙСКАЯ ШКОЛА ТАНЦА • НОВОСИБИРСК
      </text>
    </g>

    <!-- 5. Главный заголовок с контрастным курсивом в слове НАБОР -->
    <g id="Главный заголовок" transform="translate(560, 96)">
      <!-- Строка 1 -->
      <text x="0" y="0" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="74" font-weight="700" letter-spacing="3">
        <tspan fill="#1E2229">ОТКРЫВАЕМ </tspan>
        <tspan fill="#284B35" font-style="italic" font-weight="600">НАБОР</tspan>
      </text>
      <!-- Строка 2 -->
      <text x="0" y="68" text-anchor="middle" fill="#1E2229" font-family="'Cormorant Garamond', Georgia, serif" font-size="74" font-weight="700" letter-spacing="3">
        НА НОВЫЙ СЕЗОН
      </text>
    </g>

    <!-- Подстрочник -->
    <g id="Подстрочник" transform="translate(560, 218)">
      <text x="0" y="0" text-anchor="middle" fill="#323842" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        Помогаем раскрыть природную грацию, пластику и уверенность в себе.
      </text>
      <text x="0" y="26" text-anchor="middle" fill="#323842" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        Создаём пространство, где берегут детское здоровье, учат слышать
      </text>
      <text x="0" y="52" text-anchor="middle" fill="#323842" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        музыку и искренне радоваться каждому движению.
      </text>
    </g>
  </g>

  <!-- 1 & 4. ДИНАМИЧНЫЕ БОКОВЫЕ ТЕГИ-НАКЛЕЙКИ (ЦЕНТР ПОЛНОСТЬЮ СВОБОДЕН) -->
  <g id="2. Динамичные теги-наклейки">
    
    <!-- ЛЕВАЯ СТОРОНА (LOTUS) — В упор к левому краю (x: 36) -->
    <g id="Левая сторона — LOTUS" transform="translate(36, 730)">
      <!-- Бейдж направления -->
      <g transform="translate(0, 0)">
        <rect width="290" height="36" rx="12" fill="url(#badgeLotusGrad)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1"/>
        <text x="145" y="24" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15" font-weight="800">
          Школа балета LOTUS (от 3 лет)
        </text>
      </g>

      <!-- Тег 1: Осанка (x: 0, w: 325) -->
      <g transform="translate(0, 48)" filter="url(#tagShadow)">
        <rect width="325" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="309" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconBalletB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Красивая осанка</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">ровная спина и лёгкость</text>
        <!-- Звезда -->
        <text x="312" y="10" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Тег 2: Растяжка (смещение x: 18, w: 345) -->
      <g transform="translate(18, 116)" filter="url(#tagShadow)">
        <rect width="345" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="329" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconStretchB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Мягкая растяжка</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">бережно, без боли и слёз</text>
        <!-- Звезда -->
        <text x="330" y="52" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Тег 3: Ритм (смещение x: 4, w: 325) -->
      <g transform="translate(4, 184)" filter="url(#tagShadow)">
        <rect width="325" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="309" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconRhythmB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Чувство ритма</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">учимся слышать музыку</text>
        <!-- Звезда -->
        <text x="20" y="8" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>
    </g>

    <!-- ПРАВАЯ СТОРОНА (SoMA) — В упор к правому окну -->
    <g id="Правая сторона — SoMA" transform="translate(860, 730)">
      <!-- Бейдж направления -->
      <g transform="translate(60, 0)">
        <rect width="280" height="36" rx="12" fill="url(#badgeSomaGrad)" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1"/>
        <text x="140" y="24" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15" font-weight="800">
          Современные танцы SoMA
        </text>
      </g>

      <!-- Тег 1: Уверенность (x: 0, w: 340) -->
      <g transform="translate(0, 48)" filter="url(#tagShadow)">
        <rect width="340" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="324" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconLightningB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Уверенность в себе</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">раскрепощение и смелость</text>
        <text x="12" y="10" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Тег 2: Хип-хоп (смещение x: -20, w: 360) -->
      <g transform="translate(-20, 116)" filter="url(#tagShadow)">
        <rect width="360" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="344" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconSneakerB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Хип-хоп и модные танцы</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">современный драйв</text>
        <text x="345" y="52" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>

      <!-- Тег 3: Сцена (смещение x: -4, w: 344) -->
      <g transform="translate(-4, 184)" filter="url(#tagShadow)">
        <rect width="344" height="58" rx="20" fill="#FFFFFF" fill-opacity="0.70" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
        <line x1="16" y1="1" x2="328" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
        <image href="${iconTrophyB64}" x="10" y="8" width="42" height="42"/>
        <text x="58" y="26" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Выступления на сцене</text>
        <text x="58" y="44" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13" font-weight="600">команда и новые друзья</text>
        <text x="325" y="10" fill="#E5B25D" font-size="14" filter="url(#sparkleGlow)">✦</text>
      </g>
    </g>

  </g>

  <!-- 5. СТРОКА ГАРАНТИЙ (ВЫРАВНЕНЫ ПО ЦЕНТРУ) -->
  <g id="3. Блок гарантий" transform="translate(40, 1430)">
    <!-- Гарантия 1 -->
    <g transform="translate(0, 0)" filter="url(#guaranteeShadow)">
      <rect width="375" height="64" rx="18" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
      <line x1="18" y1="1" x2="357" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
      <text x="187" y="26" text-anchor="middle" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="15.5" font-weight="800">0 ₽ — Пробный урок</text>
      <text x="187" y="47" text-anchor="middle" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">для мягкого знакомства</text>
    </g>

    <!-- Гарантия 2 -->
    <g transform="translate(393, 0)" filter="url(#guaranteeShadow)">
      <rect width="375" height="64" rx="18" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
      <line x1="18" y1="1" x2="357" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
      <text x="187" y="26" text-anchor="middle" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="15.5" font-weight="800">Чуткие педагоги</text>
      <text x="187" y="47" text-anchor="middle" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">бережная методика</text>
    </g>

    <!-- Гарантия 3 -->
    <g transform="translate(785, 0)" filter="url(#guaranteeShadow)">
      <rect width="375" height="64" rx="18" fill="#FFFFFF" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1"/>
      <line x1="18" y1="1" x2="357" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.95"/>
      <text x="187" y="26" text-anchor="middle" fill="#1E2229" font-family="Onest, Montserrat, sans-serif" font-size="15.5" font-weight="800">Гослицензия</text>
      <text x="187" y="47" text-anchor="middle" fill="#4A5450" font-family="Onest, Montserrat, sans-serif" font-size="13.5" font-weight="600">Налоговый вычет 13%</text>
    </g>
  </g>

  <!-- 6. ФУТЕР (ТЕМНЫЙ ГЛЯНЦЕВЫЙ БАР) -->
  <g id="4. Футер (Footer Dock)" transform="translate(35, 1590)" filter="url(#footerShadow)">
    <rect width="1170" height="120" rx="22" fill="#14181E" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1"/>
    <line x1="24" y1="1" x2="1146" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.25"/>

    <!-- Филиалы (слева) -->
    <g transform="translate(32, 24)">
      <text x="0" y="16" fill="#D4A853" font-family="Montserrat, sans-serif" font-size="14" font-weight="800">📍 Филиалы в Новосибирске:</text>
      <text x="0" y="40" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13" font-weight="600">• ул. Большевистская, 125</text>
      <text x="0" y="60" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13" font-weight="600">• ул. Планетная, 53</text>
      <text x="0" y="80" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13" font-weight="600">• ул. Мясниковой, 25/2</text>
    </g>

    <!-- Кнопка CTA (по центру) -->
    <g transform="translate(405, 30)" filter="url(#btnShadow)">
      <rect width="360" height="60" rx="30" fill="url(#goldBtnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <line x1="30" y1="2" x2="330" y2="2" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.6"/>
      <text x="180" y="37" text-anchor="middle" fill="#14181E" font-family="Montserrat, sans-serif" font-size="15" font-weight="900" letter-spacing="1">
        ЗАПИСАТЬСЯ НА ПРОБНЫЙ УРОК →
      </text>
    </g>

    <!-- Телефоны и QR (справа) -->
    <g transform="translate(810, 24)">
      <!-- Телефоны -->
      <g transform="translate(230, 10)">
        <text x="0" y="14" text-anchor="end" fill="#A0ABA5" font-family="Montserrat, sans-serif" font-size="12" font-weight="700">Телефоны руководства</text>
        <text x="0" y="36" text-anchor="end" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">+7 (913) 765-4321</text>
        <text x="0" y="58" text-anchor="end" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">+7 (383) 221-1222</text>
      </g>

      <!-- QR код -->
      <g transform="translate(250, 6)">
        <rect width="72" height="72" rx="12" fill="#FFFFFF"/>
        <image href="${realQrB64}" x="4" y="4" width="64" height="64"/>
      </g>
    </g>
  </g>

  <!-- Фактура матовой бумаги -->
  <rect width="1240" height="1754" filter="url(#paperGrain)" pointer-events="none"/>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/dance-stage-realism-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated Dynamic Sticker Tags SVG!');
