import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

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

function buildTennisSvg(cityName, addressLines) {
  const addressSvgTexts = addressLines.map((line, idx) => {
    const yPos = 46 + idx * (addressLines.length > 3 ? 27 : 32);
    return `<text x="64" y="${yPos}" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="21.5" font-weight="700" letter-spacing="0.3">${line}</text>`;
  }).join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
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
  <g id="07. Подвал (Контакты)" transform="translate(60, 1540)">
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

    <!-- Правая колонка: Адреса Филиалов с указанием Города -->
    <g id="Адреса Филиалов" transform="translate(560, 0)">
      <circle cx="24" cy="24" r="21" fill="#FFFFFF" fill-opacity="0.85" stroke="#1A3628" stroke-width="2.4"/>
      <path d="M24 13C19.5 13 16 16.5 16 21C16 26.5 24 35 24 35C24 35 32 26.5 32 21C32 16.5 28.5 13 24 13Z" stroke="#1A3628" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="24" cy="21" r="3.5" fill="#1A3628"/>
      
      <!-- Город (сверху в подвале над адресами) -->
      <text x="64" y="16" fill="#1A3628" font-family="'Montserrat', sans-serif" font-size="22.5" font-weight="900" letter-spacing="0.4">
        ${cityName}:
      </text>
      
      <!-- Список адресов -->
      ${addressSvgTexts}
    </g>
  </g>
</svg>
`;
}

// 1. Novosibirsk Variant
const nskAddresses = [
  'ул. Ласковая, 18',
  'ул. Большевистская, 125',
  'ул. Планетная, 53',
  'ул. Мясниковой, 25/2'
];
const nskSvg = buildTennisSvg('г. Новосибирск', nskAddresses);

// 2. Chelyabinsk Variant
const chelAddresses = [
  'ул. 250-летия Челябинска, 46',
  'ул. Карпенко, 5Б',
  'ул. Труда, 183'
];
const chelSvg = buildTennisSvg('г. Челябинск', chelAddresses);

// Write targets
const nskTargets = [
  path.resolve(__dirname, '../../sparta-tennis-poster-novosibirsk.svg'),
  path.resolve(__dirname, '../../sparta-tennis-poster.svg'), // default
  path.resolve(__dirname, '../public/sparta-tennis-poster-novosibirsk.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-poster.svg'),
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-novosibirsk.svg'),
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-poster-novosibirsk.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-poster.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-poster-novosibirsk.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-poster.svg'),
];

const chelTargets = [
  path.resolve(__dirname, '../../sparta-tennis-poster-chelyabinsk.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-poster-chelyabinsk.svg'),
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-chelyabinsk.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-poster-chelyabinsk.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-poster-chelyabinsk.svg'),
];

for (const p of nskTargets) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, nskSvg, 'utf-8');
  console.log('✅ [NSK] Saved SVG to: ' + p);
}

for (const p of chelTargets) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, chelSvg, 'utf-8');
  console.log('✅ [CHEL] Saved SVG to: ' + p);
}

// Generate Standalone HTML files for Puppeteer rendering
function buildHtml(cityName, addressLines) {
  const addressDivs = addressLines.map(line => `<div>${line}</div>`).join('\n            ');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ЦСП СПАРТА — Большой теннис (${cityName})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    body {
      width: 1240px;
      height: 1754px;
      overflow: hidden;
      background-color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
      position: relative;
    }
    .poster {
      width: 1240px;
      height: 1754px;
      position: relative;
      overflow: hidden;
    }
    .bg-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 1240px;
      height: 1754px;
      object-fit: cover;
      z-index: 1;
    }
    .foreground-bokeh-layer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1240px;
      height: 420px;
      object-fit: cover;
      z-index: 2;
      pointer-events: none;
      opacity: 0.92;
    }
    .bottom-mask {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1240px;
      height: 360px;
      background: linear-gradient(180deg, 
        rgba(255, 255, 255, 0) 0%, 
        rgba(255, 255, 255, 0.45) 30%, 
        rgba(255, 255, 255, 0.88) 75%, 
        rgba(255, 255, 255, 0.98) 100%);
      z-index: 3;
      pointer-events: none;
    }
    .content-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 1240px;
      height: 1754px;
      z-index: 4;
      padding: 65px 0 50px 0;
      display: flex;
      flex-direction: column;
    }
    .top-center-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 8px;
      padding: 0 60px;
    }
    .top-nadzagolovok {
      font-size: 35px;
      font-weight: 900;
      color: #1A3628;
      letter-spacing: 2px;
      text-transform: uppercase;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    .top-podzagolovok {
      font-size: 25px;
      font-weight: 700;
      color: #1A3628;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .center-logo-box {
      width: 145px;
      height: 145px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.22));
    }
    .center-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .main-title-container {
      display: flex;
      justify-content: center;
      margin-top: 15px;
      margin-bottom: 25px;
      width: 100%;
    }
    .volumetric-title-wrap {
      position: relative;
      display: inline-block;
      text-align: center;
    }
    .title-extrusion-back {
      position: absolute;
      top: 5px;
      left: 5px;
      font-size: 165px;
      font-weight: 900;
      line-height: 0.82;
      letter-spacing: 2px;
      color: #0E2117;
      user-select: none;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .title-front-textured {
      position: relative;
      font-size: 165px;
      font-weight: 900;
      line-height: 0.82;
      letter-spacing: 2px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      background-image: url('${netPhotoB64}');
      background-size: cover;
      background-position: center;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 1.5px #FFFBEB) drop-shadow(0 0 1.5px #FFFBEB);
    }
    .benefits-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      margin-top: 5px;
      margin-bottom: 12px;
      padding-left: 0;
    }
    .trapezoid-badge {
      height: 86px;
      background: linear-gradient(90deg, 
        rgba(19, 44, 32, 0.92) 0%, 
        rgba(26, 54, 40, 0.90) 50%, 
        rgba(42, 78, 57, 0.86) 100%);
      clip-path: polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%);
      display: flex;
      align-items: center;
      padding-left: 145px;
      padding-right: 35px;
      border-left: 5px solid #D4AF37;
      box-shadow: 0 5px 12px rgba(14, 33, 23, 0.25);
      position: relative;
    }
    .badge-1 { width: 435px; }
    .badge-2 { width: 410px; }
    .badge-3 { width: 390px; }
    .badge-4 { width: 440px; }
    .badge-text {
      font-size: 23.5px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.22;
      letter-spacing: 0.2px;
    }
    .cta-trapezoid-badge {
      width: 460px;
      height: 90px;
      background: #D4FF00;
      clip-path: polygon(0 0, 100% 0, calc(100% - 32px) 100%, 0 100%);
      display: flex;
      align-items: center;
      padding-left: 50px;
      padding-right: 35px;
      box-shadow: 0 8px 24px rgba(212, 255, 0, 0.35);
      margin-top: 0;
      cursor: pointer;
    }
    .cta-badge-text {
      font-size: 22.5px;
      font-weight: 800;
      color: #1A3628;
      line-height: 1.25;
      letter-spacing: 0.3px;
    }
    .footer-group {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0 60px;
      padding-bottom: 10px;
      position: relative;
      z-index: 5;
    }
    .footer-col {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .footer-icon {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
    }
    .footer-icon svg {
      width: 100%;
      height: 100%;
    }
    .footer-text {
      font-size: 21.5px;
      font-weight: 700;
      color: #1A3628;
      line-height: 1.34;
      letter-spacing: 0.3px;
    }
    .city-heading {
      font-size: 22.5px;
      font-weight: 900;
      color: #1A3628;
      letter-spacing: 0.4px;
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <div class="poster">
    <img src="${bgPhotoB64}" alt="Фон" class="bg-layer">
    <img src="${bokehB64}" alt="Боке" class="foreground-bokeh-layer">
    <div class="bottom-mask"></div>
    <div class="content-layer">
      <div class="top-center-group">
        <div class="top-nadzagolovok">ЦСП «СПАРТА»</div>
        <div class="top-podzagolovok">ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ</div>
        <div class="center-logo-box">
          <img src="${crestB64}" alt="Герб SPARTA" class="center-logo-img">
        </div>
      </div>
      <div class="main-title-container">
        <div class="volumetric-title-wrap">
          <div class="title-extrusion-back">
            <span>БОЛЬШОЙ</span>
            <span>ТЕННИС</span>
          </div>
          <h1 class="title-front-textured">
            <span>БОЛЬШОЙ</span>
            <span>ТЕННИС</span>
          </h1>
        </div>
      </div>
      <div class="benefits-column">
        <div class="trapezoid-badge badge-1">
          <div class="badge-text">
            <div>- Пробная</div>
            <div>тренировка 0 ₽</div>
          </div>
        </div>
        <div class="trapezoid-badge badge-2">
          <div class="badge-text">
            <div>- Заморозка</div>
            <div>при болезни</div>
          </div>
        </div>
        <div class="trapezoid-badge badge-3">
          <div class="badge-text">
            <div>- Гос.</div>
            <div>лицензия</div>
          </div>
        </div>
        <div class="trapezoid-badge badge-4">
          <div class="badge-text">
            <div>- Налоговый</div>
            <div>вычет 13%</div>
          </div>
        </div>
      </div>
      <div class="cta-trapezoid-badge">
        <div class="cta-badge-text">
          <div>Успейте записаться</div>
          <div>на первую тренировку →</div>
        </div>
      </div>
      <div class="footer-group">
        <div class="footer-col">
          <div class="footer-icon">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="21" fill="#FFFFFF" fill-opacity="0.85" stroke="#1A3628" stroke-width="2.4"/>
              <path d="M32 27.5V30.5C32 31.5 31 32.5 30 32.5C21 32 16 27 15.5 18C15.5 17 16.5 16 17.5 16H20.5C21.5 16 22.3 16.8 22.5 17.8C22.7 19 23.2 20.2 23.9 21.2C24.4 21.9 24.2 22.8 23.5 23.3L22.2 24.3C23.4 26.5 25.5 28.6 27.7 29.8L28.7 28.5C29.2 27.8 30.1 27.6 30.8 28.1C31.8 28.8 33 29.3 34.2 29.5C35.2 29.7 36 30.5 36 31.5" stroke="#1A3628" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="footer-text">
            <div>+7 919 339 33 99 - Директор</div>
            <div>+7 (351) 230-12-69 - Администратор</div>
          </div>
        </div>
        <div class="footer-col">
          <div class="footer-icon">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="21" fill="#FFFFFF" fill-opacity="0.85" stroke="#1A3628" stroke-width="2.4"/>
              <path d="M24 13C19.5 13 16 16.5 16 21C16 26.5 24 35 24 35C24 35 32 26.5 32 21C32 16.5 28.5 13 24 13Z" stroke="#1A3628" stroke-width="2.4" stroke-linejoin="round"/>
              <circle cx="24" cy="21" r="3.5" fill="#1A3628"/>
            </svg>
          </div>
          <div class="footer-text">
            <div class="city-heading">${cityName}:</div>
            ${addressDivs}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

const nskHtml = buildHtml('г. Новосибирск', nskAddresses);
const chelHtml = buildHtml('г. Челябинск', chelAddresses);

const nskHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-novosibirsk-standalone.html');
const chelHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-chelyabinsk-standalone.html');

fs.writeFileSync(nskHtmlPath, nskHtml, 'utf-8');
fs.writeFileSync(chelHtmlPath, chelHtml, 'utf-8');
console.log('✅ HTML files saved for Puppeteer rendering');

async function renderVisuals() {
  console.log('🚀 Launching Puppeteer to export high-res PNG & PDF for both variants...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1240,
    height: 1754,
    deviceScaleFactor: 2
  });

  // Render Novosibirsk
  await page.goto(`file://${nskHtmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  const nskPngOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-poster-novosibirsk.png'),
    path.resolve(__dirname, '../public/sparta-tennis-poster-novosibirsk.png'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-novosibirsk.png')
  ];
  const nskPdfOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-poster-novosibirsk.pdf'),
    path.resolve(__dirname, '../public/sparta-tennis-poster-novosibirsk.pdf'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-novosibirsk.pdf')
  ];

  await page.screenshot({ path: nskPngOutputs[1], type: 'png' });
  fs.copyFileSync(nskPngOutputs[1], nskPngOutputs[0]);
  fs.copyFileSync(nskPngOutputs[1], nskPngOutputs[2]);

  await page.pdf({
    path: nskPdfOutputs[1],
    width: '1240px',
    height: '1754px',
    printBackground: true,
    pageRanges: '1'
  });
  fs.copyFileSync(nskPdfOutputs[1], nskPdfOutputs[0]);
  fs.copyFileSync(nskPdfOutputs[1], nskPdfOutputs[2]);
  console.log('🎉 [NSK] PNG and PDF exported successfully!');

  // Render Chelyabinsk
  await page.goto(`file://${chelHtmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  const chelPngOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-poster-chelyabinsk.png'),
    path.resolve(__dirname, '../public/sparta-tennis-poster-chelyabinsk.png'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-chelyabinsk.png')
  ];
  const chelPdfOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-poster-chelyabinsk.pdf'),
    path.resolve(__dirname, '../public/sparta-tennis-poster-chelyabinsk.pdf'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster-chelyabinsk.pdf')
  ];

  await page.screenshot({ path: chelPngOutputs[1], type: 'png' });
  fs.copyFileSync(chelPngOutputs[1], chelPngOutputs[0]);
  fs.copyFileSync(chelPngOutputs[1], chelPngOutputs[2]);

  await page.pdf({
    path: chelPdfOutputs[1],
    width: '1240px',
    height: '1754px',
    printBackground: true,
    pageRanges: '1'
  });
  fs.copyFileSync(chelPdfOutputs[1], chelPdfOutputs[0]);
  fs.copyFileSync(chelPdfOutputs[1], chelPdfOutputs[2]);
  console.log('🎉 [CHEL] PNG and PDF exported successfully!');

  await browser.close();
}

renderVisuals().then(() => {
  console.log('🌟 All SVG, HTML, PNG, and PDF outputs generated perfectly!');
}).catch(err => {
  console.error('❌ Error during rendering:', err);
});
