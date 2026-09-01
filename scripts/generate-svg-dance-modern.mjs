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
    <!-- Liquid Glass Shadows & Glows -->
    <filter id="liquidGlassShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.14"/>
    </filter>
    <filter id="guaranteeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.10"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
    <filter id="btnShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#D4A853" flood-opacity="0.5"/>
    </filter>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="10" flood-color="#FFFFFF" flood-opacity="0.95"/>
    </filter>

    <!-- Liquid Glass Linear Gradients -->
    <linearGradient id="liquidCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.48"/>
    </linearGradient>

    <linearGradient id="liquidPillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.32"/>
    </linearGradient>

    <linearGradient id="iconGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.40"/>
    </linearGradient>

    <linearGradient id="badgeLotusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#284B35" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1A3825" stop-opacity="0.98"/>
    </linearGradient>

    <linearGradient id="badgeSomaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3E3458" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#28203B" stop-opacity="0.98"/>
    </linearGradient>

    <linearGradient id="goldBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2B866"/>
      <stop offset="50%" stop-color="#D4A853"/>
      <stop offset="100%" stop-color="#C49642"/>
    </linearGradient>
  </defs>

  <!-- 0. ФОН: СТУДИЯ С ДЕТЬМИ -->
  <g id="0. Фон (Background)">
    <image href="${bgPhotoB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice"/>
    <!-- Верхний градиентный рассеиватель -->
    <rect width="1240" height="500" fill="url(#topLightGrad)"/>
    <linearGradient id="topLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.88"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.60"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </g>

  <!-- 1. ШАПКА И ГЛАВНЫЙ ЗАГОЛОВОК -->
  <g id="1. Шапка (Header)" transform="translate(60, 38)">
    <!-- Тонкие орбиты на фоне -->
    <g id="Орбиты">
      <ellipse cx="560" cy="180" rx="370" ry="145" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5" transform="rotate(-7 560 180)"/>
      <ellipse cx="560" cy="180" rx="470" ry="185" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.5" transform="rotate(5 560 180)"/>
    </g>

    <!-- Надзаголовок (Пилюля Liquid Glass) -->
    <g id="Пилюля" transform="translate(320, 0)">
      <rect width="480" height="42" rx="21" fill="url(#liquidPillGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1.5"/>
      <line x1="340" y1="2" x2="780" y2="2" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.8"/>
      <text x="240" y="27" text-anchor="middle" fill="#121815" font-family="Montserrat, sans-serif" font-size="14" font-weight="800" letter-spacing="2">
        ВСЕРОССИЙСКАЯ ШКОЛА ТАНЦА • НОВОСИБИРСК
      </text>
    </g>

    <!-- Главный заголовок -->
    <g id="Главный заголовок" transform="translate(560, 95)" filter="url(#textGlow)">
      <text x="0" y="0" text-anchor="middle" fill="#121815" font-family="'Cormorant Garamond', 'Playfair Display', Georgia, serif" font-size="70" font-weight="700" letter-spacing="4">
        ОТКРЫВАЕМ НАБОР
      </text>
      <text x="0" y="68" text-anchor="middle" fill="#121815" font-family="'Cormorant Garamond', 'Playfair Display', Georgia, serif" font-size="70" font-weight="700" letter-spacing="4">
        НА НОВЫЙ СЕЗОН
      </text>
    </g>

    <!-- Подстрочник -->
    <g id="Подстрочник" transform="translate(560, 215)">
      <text x="0" y="0" text-anchor="middle" fill="#242E28" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        Помогаем раскрыть природную грацию, пластику и уверенность в себе.
      </text>
      <text x="0" y="26" text-anchor="middle" fill="#242E28" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        Создаём пространство, где берегут детское здоровье, учат слышать
      </text>
      <text x="0" y="52" text-anchor="middle" fill="#242E28" font-family="Onest, Montserrat, sans-serif" font-size="17" font-weight="600">
        музыку и искренне радоваться каждому движению.
      </text>
    </g>
  </g>

  <!-- 2. ДВЕ КАРТОЧКИ НАПРАВЛЕНИЙ (LIQUID GLASS + 3D ИКОНКИ) -->
  <g id="2. Карточки направлений" transform="translate(60, 1070)">
    
    <!-- Левая карточка — Балет LOTUS -->
    <g id="Левая карточка — LOTUS" transform="translate(0, 0)" filter="url(#liquidGlassShadow)">
      <!-- Тело жидкого стекла -->
      <rect width="540" height="265" rx="26" fill="url(#liquidCardGrad)" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="1.5"/>
      <!-- Верхний световой блик по грани -->
      <path d="M 26 1 L 514 1" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.95" stroke-linecap="round"/>
      
      <!-- Плашка-заголовок -->
      <g transform="translate(24, 20)">
        <rect width="330" height="38" rx="12" fill="url(#badgeLotusGrad)" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1"/>
        <line x1="12" y1="1" x2="318" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.5"/>
        <text x="165" y="25" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="16" font-weight="800">
          Школа балета LOTUS (от 3 лет)
        </text>
      </g>

      <!-- Пункты списка с 3D иконками -->
      <g transform="translate(24, 76)">
        <!-- Пункт 1: 3D Пуанты -->
        <g transform="translate(0, 0)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconBalletB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="20" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Красивая осанка</text>
          <text x="62" y="40" fill="#384640" font-family="Onest, Montserrat, sans-serif" font-size="14.5" font-weight="600">(ровная спина и лёгкость)</text>
        </g>

        <!-- Пункт 2: 3D Лотос Растяжка -->
        <g transform="translate(0, 60)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconStretchB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="20" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Мягкая растяжка</text>
          <text x="62" y="40" fill="#384640" font-family="Onest, Montserrat, sans-serif" font-size="14.5" font-weight="600">(без боли и слёз)</text>
        </g>

        <!-- Пункт 3: 3D Ритм Ключ -->
        <g transform="translate(0, 120)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconRhythmB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="20" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Чувство ритма</text>
          <text x="62" y="40" fill="#384640" font-family="Onest, Montserrat, sans-serif" font-size="14.5" font-weight="600">(учимся слышать музыку)</text>
        </g>
      </g>
    </g>

    <!-- Правая карточка — Современные танцы SoMA -->
    <g id="Правая карточка — SoMA" transform="translate(580, 0)" filter="url(#liquidGlassShadow)">
      <!-- Тело жидкого стекла -->
      <rect width="540" height="265" rx="26" fill="url(#liquidCardGrad)" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="1.5"/>
      <!-- Верхний световой блик по грани -->
      <path d="M 26 1 L 514 1" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.95" stroke-linecap="round"/>
      
      <!-- Плашка-заголовок -->
      <g transform="translate(24, 20)">
        <rect width="420" height="38" rx="12" fill="url(#badgeSomaGrad)" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1"/>
        <line x1="12" y1="1" x2="408" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.5"/>
        <text x="210" y="25" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="16" font-weight="800">
          Современные танцы SoMA (для детей и подростков)
        </text>
      </g>

      <!-- Пункты списка с 3D иконками -->
      <g transform="translate(24, 76)">
        <!-- Пункт 1: 3D Молния -->
        <g transform="translate(0, 0)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconLightningB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="20" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Уверенность в себе</text>
          <text x="62" y="40" fill="#384640" font-family="Onest, Montserrat, sans-serif" font-size="14.5" font-weight="600">(раскрепощение и смелость)</text>
        </g>

        <!-- Пункт 2: 3D Кроссовки -->
        <g transform="translate(0, 60)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconSneakerB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="28" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Хип-хоп и модные танцы</text>
        </g>

        <!-- Пункт 3: 3D Кубок -->
        <g transform="translate(0, 120)">
          <rect width="48" height="48" rx="14" fill="url(#iconGlassGrad)" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="1"/>
          <image href="${iconTrophyB64}" x="5" y="5" width="38" height="38"/>
          <text x="62" y="20" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="17.5" font-weight="800">Выступления на сцене</text>
          <text x="62" y="40" fill="#384640" font-family="Onest, Montserrat, sans-serif" font-size="14.5" font-weight="600">(команда и новые друзья)</text>
        </g>
      </g>
    </g>

  </g>

  <!-- 3. БЛОК ГАРАНТИЙ (3 ПЛАШКИ В РЯД): LIQUID GLASS -->
  <g id="3. Блок гарантий" transform="translate(60, 1365)">
    <!-- Гарантия 1 -->
    <g transform="translate(0, 0)" filter="url(#guaranteeShadow)">
      <rect width="355" height="68" rx="18" fill="url(#liquidPillGrad)" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.5"/>
      <line x1="18" y1="1" x2="337" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.9"/>
      <text x="20" y="28" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">0 ₽ — Пробный урок</text>
      <text x="20" y="50" fill="#44524C" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">для мягкого знакомства.</text>
    </g>

    <!-- Гарантия 2 -->
    <g transform="translate(382, 0)" filter="url(#guaranteeShadow)">
      <rect width="355" height="68" rx="18" fill="url(#liquidPillGrad)" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.5"/>
      <line x1="18" y1="1" x2="337" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.9"/>
      <text x="20" y="28" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Чуткие педагоги —</text>
      <text x="20" y="50" fill="#44524C" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">бережная методика</text>
    </g>

    <!-- Гарантия 3 -->
    <g transform="translate(765, 0)" filter="url(#guaranteeShadow)">
      <rect width="355" height="68" rx="18" fill="url(#liquidPillGrad)" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.5"/>
      <line x1="18" y1="1" x2="337" y2="1" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.9"/>
      <text x="20" y="28" fill="#121815" font-family="Onest, Montserrat, sans-serif" font-size="16" font-weight="800">Гослицензия —</text>
      <text x="20" y="50" fill="#44524C" font-family="Onest, Montserrat, sans-serif" font-size="14" font-weight="600">Налоговый вычет 13%</text>
    </g>
  </g>

  <!-- 4. ФУТЕР (ТЕМНЫЙ ГЛЯНЦЕВЫЙ БАР) -->
  <g id="4. Футер (Footer Dock)" transform="translate(40, 1590)" filter="url(#footerShadow)">
    <rect width="1160" height="120" rx="24" fill="#14181E" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1"/>
    <line x1="24" y1="1" x2="1136" y2="1" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.25"/>

    <!-- Филиалы (слева) -->
    <g transform="translate(32, 24)">
      <text x="0" y="16" fill="#D4A853" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">📍 Филиалы в Новосибирске:</text>
      <text x="0" y="40" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Большевистская, 125</text>
      <text x="0" y="60" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Планетная, 53</text>
      <text x="0" y="80" fill="#D8E0DC" font-family="Onest, sans-serif" font-size="13.5" font-weight="600">• ул. Мясниковой, 25/2</text>
    </g>

    <!-- Кнопка CTA (по центру) -->
    <g transform="translate(400, 30)" filter="url(#btnShadow)">
      <rect width="360" height="60" rx="30" fill="url(#goldBtnGrad)" stroke="#FFFFFF" stroke-width="2"/>
      <line x1="30" y1="2" x2="330" y2="2" stroke="#FFFFFF" stroke-width="1.5" stroke-opacity="0.6"/>
      <text x="180" y="37" text-anchor="middle" fill="#14181E" font-family="Montserrat, sans-serif" font-size="15" font-weight="900" letter-spacing="1">
        ЗАПИСАТЬСЯ НА ПРОБНЫЙ УРОК →
      </text>
    </g>

    <!-- Телефоны и QR (справа) -->
    <g transform="translate(800, 24)">
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
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/dance-stage-realism-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated 3D Icons Liquid Glass dance-stage-realism-banner.svg!');
