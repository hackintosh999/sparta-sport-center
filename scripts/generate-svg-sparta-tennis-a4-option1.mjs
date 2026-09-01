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

const bgPhotoB64 = getBase64('public/banner-assets/sparta-tennis-a4-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const giftB64 = getBase64('public/banner-assets/tennis-icon-gift.png');
const iceB64 = getBase64('public/banner-assets/tennis-icon-ice.png');
const shieldB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const taxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

function buildTennisA4SvgOpt1(cityName, addressLines) {
  const isTwoLines = addressLines.length <= 2;
  const startY = isTwoLines ? 66 : 56;
  const lineGap = isTwoLines ? 36 : 32;

  const addressSvgTexts = addressLines.map((line, idx) => {
    const yPos = startY + idx * lineGap;
    return `<text x="76" y="${yPos}" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="${isTwoLines ? '22.5' : '21.5'}" font-weight="700">${line}</text>`;
  }).join('\n      ');

  const cityY = isTwoLines ? 28 : 24;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <!-- Градиент для 3D карточек тенниса -->
    <linearGradient id="cardTnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7EFBD0" stop-opacity="0.92"/>
      <stop offset="38%" stop-color="#64DCD7" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#B589D6" stop-opacity="0.92"/>
    </linearGradient>

    <filter id="crestShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
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

  <!-- 02. ВЕРХНИЙ БЛОК: СПЛИТ-ШАПКА (ГЕРБ В ЛЕВОМ УГЛУ + ПОДНЯТЫЙ ЗАГОЛОВОК) -->
  <g id="02. Шапка и Главный Заголовок">
    <!-- Золотой Герб SPARTA в левом верхнем углу (120x120) -->
    <g id="Герб SPARTA" transform="translate(50, 30)" filter="url(#crestShadow)">
      <image href="${crestB64}" xlink:href="${crestB64}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Надзаголовок по центру вверху -->
    <text x="660" y="52" text-anchor="middle" fill="#0B4E49" font-family="'Montserrat', sans-serif" font-size="28" font-weight="900" letter-spacing="2.2">
      ЦСП «СПАРТА» ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ:
    </text>
    
    <!-- Поднятый 3D Заголовок БОЛЬШОЙ ТЕННИС (полностью над головой девочки) -->
    <g transform="translate(660, 68)" font-family="'Montserrat', sans-serif" font-size="142" font-weight="900" letter-spacing="2.5">
      <!-- 3D Экструзия темно-бирюзового цвета (Y 2..8) -->
      <g fill="#052123" transform="translate(0, 8)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#06282B" transform="translate(0, 7)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#083033" transform="translate(0, 6)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#09373B" transform="translate(0, 5)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0B3E42" transform="translate(0, 4)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0D454A" transform="translate(0, 3)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>
      <g fill="#0F4D52" transform="translate(0, 2)"><text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text><text x="0" y="244" text-anchor="middle">ТЕННИС</text></g>

      <!-- Лицевой Текст (Мятно-белый #E0FFF8 с белой обводкой) -->
      <g fill="#E0FFF8" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round">
        <text x="0" y="122" text-anchor="middle">БОЛЬШОЙ</text>
        <text x="0" y="244" text-anchor="middle">ТЕННИС</text>
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

  <!-- 04. ПОДВАЛ (СВЕРХУ УКАЗАН ГОРОД И АДРЕСА) -->
  <g id="04. Подвал" transform="translate(50, 1495)" filter="url(#footerShadow)">
    <rect width="1140" height="218" rx="24" fill="#061C1A" fill-opacity="0.97" stroke="#26C6DA" stroke-width="2"/>

    <!-- Левая колонка: Телефоны -->
    <g id="Контакты Телефоны" transform="translate(36, 44)">
      <circle cx="28" cy="28" r="28" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M36 31.5V34.5C36 35.5 35 36.5 34 36.5C25 36 20 31 19.5 22C19.5 21 20.5 20 21.5 20H24.5C25.5 20 26.3 20.8 26.5 21.8C26.7 23 27.2 24.2 27.9 25.2C28.4 25.9 28.2 26.8 27.5 27.3L26.2 28.3C27.4 30.5 29.5 32.6 31.7 33.8L32.7 32.5C33.2 31.8 34.1 31.6 34.8 32.1C35.8 32.8 37 33.3 38.2 33.5C39.2 33.7 40 34.5 40 35.5" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      
      <text x="82" y="32" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="82" y="70" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="23.5" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
    </g>

    <!-- Правая колонка: Адреса Филиалов с указанием Города -->
    <g id="Адреса Филиалов" transform="translate(600, 32)">
      <circle cx="28" cy="28" r="28" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M28 15C23.5 15 20 18.5 20 23C20 28.5 28 37 28 37C28 37 36 28.5 36 23C36 18.5 32.5 15 28 15Z" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="28" cy="23" r="4" fill="#26C6DA"/>

      <!-- Город сверху над адресами -->
      <text x="76" y="${cityY}" fill="#26C6DA" font-family="'Montserrat', sans-serif" font-size="22" font-weight="900" letter-spacing="0.5">${cityName}:</text>
      
      <!-- Адреса -->
      ${addressSvgTexts}
    </g>
  </g>
</svg>
`;
}

// 1. Novosibirsk Addresses
const nskAddresses = [
  'ул. Большевистская 125,',
  'ул. Мясниковой 25/2'
];
const nskSvg = buildTennisA4SvgOpt1('г. Новосибирск', nskAddresses);

// 2. Chelyabinsk Addresses
const chelAddresses = [
  'ул. Молодогвардейцев 7,',
  'ул. Молдавская 14,',
  'ул. 250-летия Челябинска 46'
];
const chelSvg = buildTennisA4SvgOpt1('г. Челябинск', chelAddresses);

// Target Paths
const nskTargets = [
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-vector.svg'),
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-novosibirsk.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-a4.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-a4-novosibirsk.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-a4-vector.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-a4-novosibirsk.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-a4.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-a4-novosibirsk.svg'),
  path.resolve(__dirname, '../../sparta-tennis-a4-vector.svg'),
  path.resolve(__dirname, '../../sparta-tennis-a4-novosibirsk.svg'),
];

const chelTargets = [
  path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-chelyabinsk.svg'),
  path.resolve(__dirname, '../public/sparta-tennis-a4-chelyabinsk.svg'),
  path.resolve(__dirname, '../dist/banner-assets/sparta-tennis-a4-chelyabinsk.svg'),
  path.resolve(__dirname, '../dist/sparta-tennis-a4-chelyabinsk.svg'),
  path.resolve(__dirname, '../../sparta-tennis-a4-chelyabinsk.svg'),
];

for (const p of nskTargets) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, nskSvg, 'utf-8');
  console.log('✅ [NSK A4 Opt1] Saved SVG to: ' + p);
}

for (const p of chelTargets) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, chelSvg, 'utf-8');
  console.log('✅ [CHEL A4 Opt1] Saved SVG to: ' + p);
}

// Generate Standalone HTML for Puppeteer Rendering
function buildHtml(cityName, addressLines) {
  const isTwoLines = addressLines.length <= 2;
  const addressDivs = addressLines.map(line => `<div>${line}</div>`).join('\n            ');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ЦСП СПАРТА — Большой теннис A4 (${cityName})</title>
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
      object-fit: fill;
      z-index: 1;
    }
    .content-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 1240px;
      height: 1754px;
      z-index: 2;
      padding: 30px 0 35px 0;
      display: flex;
      flex-direction: column;
    }
    .top-header-wrap {
      position: relative;
      width: 100%;
      height: 320px;
      margin-bottom: auto;
    }
    .corner-logo {
      position: absolute;
      top: 0;
      left: 50px;
      width: 120px;
      height: 120px;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
      z-index: 3;
    }
    .corner-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .top-subheading {
      font-size: 28px;
      font-weight: 900;
      color: #0B4E49;
      letter-spacing: 2.2px;
      text-transform: uppercase;
      text-align: center;
      padding-left: 80px;
      margin-top: 15px;
      margin-bottom: 12px;
    }
    .main-title-wrap {
      position: relative;
      text-align: center;
      font-size: 142px;
      font-weight: 900;
      line-height: 0.86;
      letter-spacing: 2.5px;
      padding-left: 80px;
    }
    .title-shadow {
      position: absolute;
      top: 8px;
      left: 0;
      right: 0;
      color: #052123;
      z-index: 1;
      padding-left: 80px;
    }
    .title-front {
      position: relative;
      color: #E0FFF8;
      -webkit-text-stroke: 1.8px #FFFFFF;
      z-index: 2;
    }
    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(2, 555px);
      gap: 16px 30px;
      margin-bottom: 24px;
      padding: 0 50px;
    }
    .benefit-card {
      height: 124px;
      background: linear-gradient(90deg, rgba(126, 251, 208, 0.92) 0%, rgba(100, 220, 215, 0.88) 38%, rgba(181, 137, 214, 0.92) 100%);
      border: 2px solid #FFFFFF;
      border-radius: 22px;
      display: flex;
      align-items: center;
      padding: 0 20px 0 16px;
      position: relative;
    }
    .card-icon {
      width: 88px;
      height: 88px;
      object-fit: contain;
      margin-right: 18px;
      flex-shrink: 0;
      filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.45));
    }
    .card-text {
      font-size: 28.5px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.25;
      text-shadow: 2.5px 3px 0 #2A0845;
    }
    .footer-panel {
      width: 1140px;
      height: 218px;
      margin: 0 auto;
      background: rgba(6, 28, 26, 0.97);
      border: 2px solid #26C6DA;
      border-radius: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 45px;
      box-shadow: 0 10px 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(38, 198, 218, 0.25);
    }
    .footer-col {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .footer-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(38, 198, 218, 0.18);
      border: 2px solid #26C6DA;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .footer-icon-wrap svg {
      width: 32px;
      height: 32px;
    }
    .footer-col-text {
      color: #FFFFFF;
      font-family: 'Montserrat', sans-serif;
    }
    .footer-col-phones {
      font-size: 23.5px;
      font-weight: 700;
      line-height: 1.6;
    }
    .city-label {
      font-size: 22px;
      font-weight: 900;
      color: #26C6DA;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .address-list {
      font-size: ${isTwoLines ? '22.5px' : '21.5px'};
      font-weight: 700;
      line-height: ${isTwoLines ? '1.55' : '1.45'};
    }
  </style>
</head>
<body>
  <div class="poster">
    <img src="${bgPhotoB64}" alt="Фон A4" class="bg-layer">
    <div class="content-layer">
      <!-- 01. Верхний блок с логотипом в углу и поднятым заголовком -->
      <div class="top-header-wrap">
        <div class="corner-logo">
          <img src="${crestB64}" alt="Герб SPARTA">
        </div>
        <div class="top-subheading">ЦСП «СПАРТА» ОТКРЫВАЕТ НОВОЕ НАПРАВЛЕНИЕ:</div>
        <div class="main-title-wrap">
          <div class="title-shadow">БОЛЬШОЙ<br>ТЕННИС</div>
          <div class="title-front">БОЛЬШОЙ<br>ТЕННИС</div>
        </div>
      </div>

      <!-- 02. 4 Карточки Преимуществ -->
      <div class="benefits-grid">
        <div class="benefit-card">
          <img src="${giftB64}" alt="Подарок" class="card-icon">
          <div class="card-text">Пробная<br>тренировка 0 ₽</div>
        </div>
        <div class="benefit-card">
          <img src="${iceB64}" alt="Лед" class="card-icon">
          <div class="card-text">Заморозка<br>при болезни</div>
        </div>
        <div class="benefit-card">
          <img src="${shieldB64}" alt="Лицензия" class="card-icon">
          <div class="card-text" style="padding-top: 10px;">Гос. лицензия</div>
        </div>
        <div class="benefit-card">
          <img src="${taxB64}" alt="Вычет" class="card-icon">
          <div class="card-text">Налоговый<br>вычет 13%</div>
        </div>
      </div>

      <!-- 03. Подвал -->
      <div class="footer-panel">
        <div class="footer-col">
          <div class="footer-icon-wrap">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M36 31.5V34.5C36 35.5 35 36.5 34 36.5C25 36 20 31 19.5 22C19.5 21 20.5 20 21.5 20H24.5C25.5 20 26.3 20.8 26.5 21.8C26.7 23 27.2 24.2 27.9 25.2C28.4 25.9 28.2 26.8 27.5 27.3L26.2 28.3C27.4 30.5 29.5 32.6 31.7 33.8L32.7 32.5C33.2 31.8 34.1 31.6 34.8 32.1C35.8 32.8 37 33.3 38.2 33.5C39.2 33.7 40 34.5 40 35.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="footer-col-text footer-col-phones">
            <div>+7 919 339 33 99 (Директор)</div>
            <div>+7 (351) 230-12-69 (Админ)</div>
          </div>
        </div>

        <div class="footer-col">
          <div class="footer-icon-wrap">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 15C23.5 15 20 18.5 20 23C20 28.5 28 37 28 37C28 37 36 28.5 36 23C36 18.5 32.5 15 28 15Z" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
              <circle cx="28" cy="23" r="4" fill="#26C6DA"/>
            </svg>
          </div>
          <div class="footer-col-text">
            <div class="city-label">${cityName}:</div>
            <div class="address-list">
              ${addressDivs}
            </div>
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

const nskHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-a4-novosibirsk-standalone.html');
const chelHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-a4-chelyabinsk-standalone.html');

fs.writeFileSync(nskHtmlPath, nskHtml, 'utf-8');
fs.writeFileSync(chelHtmlPath, chelHtml, 'utf-8');
console.log('✅ Option 1 A4 HTML files saved');

async function renderVisuals() {
  console.log('🚀 Launching Puppeteer to export high-res PNG & PDF for Option 1 A4 variants...');
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

  // Render Novosibirsk A4 Option 1
  await page.goto(`file://${nskHtmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  const nskPngOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-a4-novosibirsk.png'),
    path.resolve(__dirname, '../public/sparta-tennis-a4-novosibirsk.png'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-novosibirsk.png'),
    path.resolve(__dirname, '../dist/sparta-tennis-a4-novosibirsk.png'),
  ];
  const nskPdfOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-a4-novosibirsk.pdf'),
    path.resolve(__dirname, '../public/sparta-tennis-a4-novosibirsk.pdf'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-novosibirsk.pdf'),
    path.resolve(__dirname, '../dist/sparta-tennis-a4-novosibirsk.pdf'),
  ];

  await page.screenshot({ path: nskPngOutputs[1], type: 'png' });
  for (const p of nskPngOutputs) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(nskPngOutputs[1], p);
  }

  await page.pdf({
    path: nskPdfOutputs[1],
    width: '1240px',
    height: '1754px',
    printBackground: true,
    pageRanges: '1'
  });
  for (const p of nskPdfOutputs) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(nskPdfOutputs[1], p);
  }
  console.log('🎉 [NSK A4 Opt1] PNG and PDF exported successfully!');

  // Render Chelyabinsk A4 Option 1
  await page.goto(`file://${chelHtmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  const chelPngOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-a4-chelyabinsk.png'),
    path.resolve(__dirname, '../public/sparta-tennis-a4-chelyabinsk.png'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-chelyabinsk.png'),
    path.resolve(__dirname, '../dist/sparta-tennis-a4-chelyabinsk.png'),
  ];
  const chelPdfOutputs = [
    path.resolve(__dirname, '../../sparta-tennis-a4-chelyabinsk.pdf'),
    path.resolve(__dirname, '../public/sparta-tennis-a4-chelyabinsk.pdf'),
    path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-chelyabinsk.pdf'),
    path.resolve(__dirname, '../dist/sparta-tennis-a4-chelyabinsk.pdf'),
  ];

  await page.screenshot({ path: chelPngOutputs[1], type: 'png' });
  for (const p of chelPngOutputs) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(chelPngOutputs[1], p);
  }

  await page.pdf({
    path: chelPdfOutputs[1],
    width: '1240px',
    height: '1754px',
    printBackground: true,
    pageRanges: '1'
  });
  for (const p of chelPdfOutputs) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(chelPdfOutputs[1], p);
  }
  console.log('🎉 [CHEL A4 Opt1] PNG and PDF exported successfully!');

  await browser.close();
}

renderVisuals().then(() => {
  console.log('🌟 Option 1 Tennis A4 SVG, HTML, PNG, and PDF outputs generated perfectly!');
}).catch(err => {
  console.error('❌ Error during rendering:', err);
});
