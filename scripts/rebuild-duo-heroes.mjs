import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBase64(relPath) {
  const full = path.resolve(__dirname, '..', relPath.replace(/^\//, ''));
  if (fs.existsSync(full)) {
    const ext = path.extname(full).toLowerCase().replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
    const data = fs.readFileSync(full).toString('base64');
    return `data:${mime};base64,${data}`;
  }
  return '';
}

// Perfect hero sizing: scaling down to 880px and centering faces & dynamic actions
const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ЦСП СПАРТА — Футбол и Большой теннис (Флагманский Роллап 100x200)</title>
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
      width: 1012px;
      height: 2048px;
      overflow: hidden;
      background-color: #041017;
      font-family: 'Montserrat', sans-serif;
      position: relative;
    }

    .rollup-master {
      width: 1012px;
      height: 2048px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px 45px 30px 45px;
      background: #041017;
    }

    /* ==================== СРЕДНИЙ ФОНОВЫЙ ДУЭТ-СЛОЙ ==================== */
    .duo-bg-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 1012px;
      height: 2048px;
      z-index: 1;
      overflow: hidden;
    }

    /* Левая половина: Футбол с мальчиком */
    .football-clip-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 1012px;
      height: 1350px;
      clip-path: polygon(0 0, 520px 0, 450px 100%, 0 100%);
      overflow: hidden;
      background: #061828;
    }

    .football-clip-wrapper img {
      position: absolute;
      top: 260px;
      left: -370px;
      width: 890px;
      height: auto;
      object-fit: contain;
    }

    /* Правая половина: Теннис с девочкой */
    .tennis-clip-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 1012px;
      height: 1350px;
      clip-path: polygon(520px 0, 1012px 0, 1012px 100%, 450px 100%);
      overflow: hidden;
      background: #042622;
    }

    .tennis-clip-wrapper img {
      position: absolute;
      top: 270px;
      left: 45px;
      width: 900px;
      height: auto;
      object-fit: contain;
    }

    /* Мягкий градиент затемнения к нижней зоне преимуществ */
    .bottom-fade-gradient {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1012px;
      height: 980px;
      background: linear-gradient(180deg, rgba(4, 16, 23, 0) 0%, rgba(4, 16, 23, 0.88) 22%, #041017 50%, #041017 100%);
      z-index: 2;
    }

    /* Энергетический шов между футболом и теннисом */
    .center-seam-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 1012px;
      height: 1350px;
      z-index: 3;
      pointer-events: none;
    }

    /* ==================== КОНТЕНТНЫЙ СЛОЙ ==================== */
    .content-wrapper {
      position: relative;
      z-index: 10;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ==================== 1. ЕДИНАЯ ЦАРСКАЯ ШАПКА ==================== */
    .master-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: 4px;
    }

    .master-gold-crest {
      width: 125px;
      height: auto;
      filter: drop-shadow(0 6px 18px rgba(255, 215, 0, 0.55));
      margin-bottom: 6px;
    }

    .master-brand-title {
      font-size: 38px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
      margin-bottom: 4px;
    }

    .master-recruitment-line {
      display: inline-block;
      padding: 6px 28px;
      background: rgba(0, 255, 255, 0.14);
      border: 1.6px solid #00FFFF;
      border-radius: 30px;
      font-size: 21px;
      font-weight: 800;
      color: #00FFFF;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    /* ==================== 2. БЕЙДЖИ НАПРАВЛЕНИЙ (ФУТБОЛ & ТЕННИС) ==================== */
    .sports-badges-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 12px;
      margin-bottom: auto;
      padding: 0 8px;
    }

    .badge-sport-fb {
      padding: 10px 28px;
      background: linear-gradient(135deg, #FF1A1A 0%, #A80000 100%);
      border: 2px solid #FFE5E5;
      border-radius: 20px;
      color: #FFFFFF;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      box-shadow: 0 8px 24px rgba(255, 26, 26, 0.45), 0 4px 10px rgba(0, 0, 0, 0.6);
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    .badge-sport-tn {
      padding: 10px 28px;
      background: linear-gradient(135deg, #2ED1C6 0%, #0D6963 100%);
      border: 2px solid #E0FFF8;
      border-radius: 20px;
      color: #FFFFFF;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      box-shadow: 0 8px 24px rgba(46, 209, 198, 0.45), 0 4px 10px rgba(0, 0, 0, 0.6);
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
    }

    /* ==================== 3. ЕДИНЫЙ БЛОК 4 ПРЕИМУЩЕСТВ (СЕТКА 2x2) ==================== */
    .unified-benefits-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 22px;
      margin-top: 560px;
    }

    .benefits-title-bar {
      font-size: 26px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .benefits-title-bar span {
      color: #00FFFF;
    }

    .benefits-grid-2x2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 20px;
      width: 100%;
    }

    .benefit-master-card {
      position: relative;
      height: 120px;
      background: rgba(8, 30, 48, 0.88);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 2px solid #26C6DA;
      border-radius: 22px;
      box-shadow: 
        0 10px 24px rgba(0, 0, 0, 0.55),
        inset 0 1.5px 3px rgba(255, 255, 255, 0.6),
        inset 0 -2px 4px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      padding: 12px 20px;
      gap: 18px;
    }

    .benefit-master-card.card-accent-gold {
      border-color: #FFD700;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(255, 215, 0, 0.2);
    }

    .card-icon-img {
      width: 86px;
      height: 86px;
      object-fit: contain;
      filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.65));
      flex-shrink: 0;
    }

    .card-text-box {
      color: #FFFFFF;
      font-size: 26px;
      font-weight: 900;
      line-height: 1.18;
      letter-spacing: 0.2px;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
      text-align: left;
    }

    .card-text-box .highlight-gold {
      color: #FFD700;
    }

    .card-text-box .highlight-cyan {
      color: #00FFFF;
    }

    /* ==================== 4. ПОДВАЛ (4 АДРЕСА) ==================== */
    .master-footer-panel {
      width: 100%;
      background: rgba(4, 18, 26, 0.98);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 2px solid #26C6DA;
      border-radius: 26px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.75), 0 0 24px rgba(38, 198, 218, 0.25);
      padding: 22px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .footer-col {
      display: flex;
      align-items: center;
      gap: 18px;
      flex: 1;
    }

    .footer-icon-circle {
      width: 54px;
      height: 54px;
      flex-shrink: 0;
    }

    .footer-icon-circle svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 2px 8px rgba(38, 198, 218, 0.45));
    }

    .footer-text-block {
      font-size: 21px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.38;
      letter-spacing: 0.2px;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
    }
  </style>
</head>
<body>
  <div class="rollup-master">
    
    <!-- ФОНОВЫЙ СЛОЙ: ДУЭТ ФУТБОЛ + ТЕННИС С ДИАГОНАЛЬНЫМ ШВОМ -->
    <div class="duo-bg-container">
      
      <!-- Футбол слева с мальчиком в полный рост -->
      <div class="football-clip-wrapper">
        <img src="/banner-assets/sparta-football-clean-bg.jpg" alt="Футбол Спарта">
      </div>

      <!-- Большой теннис справа с девочкой в полный рост -->
      <div class="tennis-clip-wrapper">
        <img src="/banner-assets/sparta-tennis-girl-clean-bg.jpg" alt="Большой теннис Спарта">
      </div>
      
      <!-- Энергетический шов между ними -->
      <svg class="center-seam-line" viewBox="0 0 1012 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="seamNeon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FF1A1A"/>
            <stop offset="50%" stop-color="#FFFFFF"/>
            <stop offset="100%" stop-color="#00FFFF"/>
          </linearGradient>
          <filter id="glowSeam" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <line x1="520" y1="0" x2="450" y2="1350" stroke="#FF1A1A" stroke-width="8" opacity="0.35" filter="url(#glowSeam)"/>
        <line x1="520" y1="0" x2="450" y2="1350" stroke="#00FFFF" stroke-width="6" opacity="0.45" filter="url(#glowSeam)"/>
        <line x1="520" y1="0" x2="450" y2="1350" stroke="url(#seamNeon)" stroke-width="3.5"/>
        <line x1="520" y1="0" x2="450" y2="1350" stroke="#FFFFFF" stroke-width="1.5" opacity="0.9"/>
      </svg>

      <!-- Плавный переход в темноту внизу под карточками -->
      <div class="bottom-fade-gradient"></div>
    </div>

    <!-- ОСНОВНОЙ КОНТЕНТНЫЙ СЛОЙ -->
    <div class="content-wrapper">
      
      <!-- ==================== 1. ЕДИНАЯ ЦАРСКАЯ ШАПКА ==================== -->
      <div class="master-header">
        <img src="/banner-assets/sparta-crest-gold.png" alt="ЦСП Спарта" class="master-gold-crest">
        <div class="master-brand-title">ЦСП «СПАРТА»</div>
        <div class="master-recruitment-line">ОТКРЫВАЕТ НАБОР ДЕТЕЙ И ВЗРОСЛЫХ:</div>
      </div>

      <!-- ==================== 2. БЕЙДЖИ НАПРАВЛЕНИЙ ==================== -->
      <div class="sports-badges-row">
        <div class="badge-sport-fb">⚽ ФУТБОЛ</div>
        <div class="badge-sport-tn">🎾 БОЛЬШОЙ ТЕННИС</div>
      </div>

      <!-- ==================== 3. ЕДИНЫЙ БЛОК 4 ПРЕИМУЩЕСТВ (2x2 GRID) ==================== -->
      <div class="unified-benefits-section">
        
        <div class="benefits-title-bar">
          ПРЕИМУЩЕСТВА ЦЕНТРА <span>СПАРТА</span>
        </div>

        <div class="benefits-grid-2x2">
          
          <!-- 1. Пробная тренировка 0 ₽ -->
          <div class="benefit-master-card card-accent-gold">
            <img src="/banner-assets/icon-gift-nobg.png" alt="Пробная тренировка" class="card-icon-img">
            <div class="card-text-box">
              <div>Пробная</div>
              <div class="highlight-gold">тренировка 0 ₽</div>
            </div>
          </div>

          <!-- 2. Заморозка при болезни -->
          <div class="benefit-master-card">
            <img src="/banner-assets/icon-ice-nobg.png" alt="Заморозка" class="card-icon-img">
            <div class="card-text-box">
              <div>Заморозка</div>
              <div>при болезни</div>
            </div>
          </div>

          <!-- 3. Гос. лицензия -->
          <div class="benefit-master-card">
            <img src="/banner-assets/tennis-icon-license.png" alt="Гос лицензия" class="card-icon-img">
            <div class="card-text-box">
              <div>Государственная</div>
              <div class="highlight-cyan">лицензия</div>
            </div>
          </div>

          <!-- 4. Налоговый вычет 13% -->
          <div class="benefit-master-card card-accent-gold">
            <img src="/banner-assets/tennis-icon-tax.png" alt="Налоговый вычет" class="card-icon-img">
            <div class="card-text-box">
              <div>Налоговый</div>
              <div class="highlight-gold">вычет 13%</div>
            </div>
          </div>

        </div>

      </div>

      <!-- ==================== 4. ЕДИНЫЙ ПОДВАЛ (4 АДРЕСА) ==================== -->
      <div class="master-footer-panel">
        
        <!-- Левая колонка: Телефоны + Email -->
        <div class="footer-col">
          <div class="footer-icon-circle">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
              <path d="M32 27.5V30.5C32 31.5 31 32.5 30 32.5C21 32 16 27 15.5 18C15.5 17 16.5 16 17.5 16H20.5C21.5 16 22.3 16.8 22.5 17.8C22.7 19 23.2 20.2 23.9 21.2C24.4 21.9 24.2 22.8 23.5 23.3L22.2 24.3C23.4 26.5 25.5 28.6 27.7 29.8L28.7 28.5C29.2 27.8 30.1 27.6 30.8 28.1C31.8 28.8 33 29.3 34.2 29.5C35.2 29.7 36 30.5 36 31.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="footer-text-block">
            <div>+7 919 339 33 99 (Директор)</div>
            <div>+7 (351) 230-12-69 (Админ)</div>
            <div style="color: #00FFFF; font-size: 19.5px; font-weight: 600;">bugrova.k@bk.ru</div>
          </div>
        </div>

        <!-- Правая колонка: 4 Адреса -->
        <div class="footer-col">
          <div class="footer-icon-circle">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
              <path d="M24 13C19.5 13 16 16.5 16 21C16 26.5 24 35 24 35C24 35 32 26.5 32 21C32 16.5 28.5 13 24 13Z" stroke="#FFFFFF" stroke-width="2.2" stroke-linejoin="round"/>
              <circle cx="24" cy="21" r="3.5" fill="#26C6DA"/>
            </svg>
          </div>
          <div class="footer-text-block">
            <div>ул. Большевистская 125,</div>
            <div>ул. Планетная 53,</div>
            <div>ул. Мясниковой 25/2,</div>
            <div>ул. Ласковая 18</div>
          </div>
        </div>

      </div>

    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.resolve(__dirname, '../public/sparta-duo-rollup-master.html'), htmlContent, 'utf8');

// SVG Generator Update
const bgTennisB64 = getBase64('public/banner-assets/sparta-tennis-girl-clean-bg.jpg');
const bgFootballB64 = getBase64('public/banner-assets/sparta-football-clean-bg.jpg');
const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');
const iconGiftB64 = getBase64('public/banner-assets/icon-gift-nobg.png');
const iconIceB64 = getBase64('public/banner-assets/icon-ice-nobg.png');
const iconLicenseB64 = getBase64('public/banner-assets/tennis-icon-license.png');
const iconTaxB64 = getBase64('public/banner-assets/tennis-icon-tax.png');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1012" height="2048" viewBox="0 0 1012 2048">
  <defs>
    <!-- Диагональные маски для левой (футбол) и правой (теннис) половин -->
    <clipPath id="clipLeftFootball">
      <polygon points="0,0 520,0 450,1350 0,1350"/>
    </clipPath>
    <clipPath id="clipRightTennis">
      <polygon points="520,0 1012,0 1012,1350 450,1350"/>
    </clipPath>

    <!-- Градиент затемнения к подвалу -->
    <linearGradient id="fadeBottomDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#041017" stop-opacity="0"/>
      <stop offset="22%" stop-color="#041017" stop-opacity="0.88"/>
      <stop offset="50%" stop-color="#041017" stop-opacity="1"/>
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
    <rect width="1012" height="2048" fill="#041017"/>

    <!-- Левая половина (Футбол с видимым мальчиком) -->
    <g clip-path="url(#clipLeftFootball)">
      <image href="${bgFootballB64}" xlink:href="${bgFootballB64}" x="-370" y="260" width="890" height="1250" preserveAspectRatio="xMidYMid slice"/>
    </g>

    <!-- Правая половина (Теннис с видимой девочкой) -->
    <g clip-path="url(#clipRightTennis)">
      <image href="${bgTennisB64}" xlink:href="${bgTennisB64}" x="45" y="270" width="900" height="1250" preserveAspectRatio="xMidYMid slice"/>
    </g>

    <!-- Энергетический шов между футболом и теннисом -->
    <g id="Энергетический шов">
      <line x1="520" y1="0" x2="450" y2="1350" stroke="#FF1A1A" stroke-width="8" opacity="0.35"/>
      <line x1="520" y1="0" x2="450" y2="1350" stroke="#00FFFF" stroke-width="6" opacity="0.45"/>
      <line x1="520" y1="0" x2="450" y2="1350" stroke="url(#seamGrad)" stroke-width="3.5"/>
      <line x1="520" y1="0" x2="450" y2="1350" stroke="#FFFFFF" stroke-width="1.5" opacity="0.9"/>
    </g>

    <!-- Плавное затемнение к низу -->
    <rect y="1000" width="1012" height="1048" fill="url(#fadeBottomDark)"/>
  </g>

  <!-- ==================== 02. ЕДИНАЯ ЦАРСКАЯ ШАПКА ==================== -->
  <g id="02. Шапка ЦСП СПАРТА" transform="translate(506, 28)">
    <image href="${crestB64}" xlink:href="${crestB64}" x="-62" y="0" width="125" height="125" preserveAspectRatio="xMidYMid meet"/>
    
    <text x="0" y="165" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="38" font-weight="900" letter-spacing="3">
      ЦСП «СПАРТА»
    </text>

    <g transform="translate(0, 182)">
      <rect x="-260" y="0" width="520" height="42" rx="21" fill="#00FFFF" fill-opacity="0.15" stroke="#00FFFF" stroke-width="1.6"/>
      <text x="0" y="28" text-anchor="middle" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="800" letter-spacing="2">
        ОТКРЫВАЕТ НАБОР ДЕТЕЙ И ВЗРОСЛЫХ:
      </text>
    </g>
  </g>

  <!-- ==================== 03. БЕЙДЖИ НАПРАВЛЕНИЙ ==================== -->
  <g id="03. Бейджи направлений" transform="translate(0, 275)">
    <g transform="translate(55, 0)">
      <rect width="280" height="66" rx="20" fill="#FF1A1A" stroke="#FFE5E5" stroke-width="2"/>
      <text x="140" y="46" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="32" font-weight="900" letter-spacing="1.5">
        ⚽ ФУТБОЛ
      </text>
    </g>

    <g transform="translate(555, 0)">
      <rect width="400" height="66" rx="20" fill="#2ED1C6" stroke="#E0FFF8" stroke-width="2"/>
      <text x="200" y="46" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="30" font-weight="900" letter-spacing="1.5">
        🎾 БОЛЬШОЙ ТЕННИС
      </text>
    </g>
  </g>

  <!-- ==================== 04. ЕДИНЫЙ БЛОК 4 ПРЕИМУЩЕСТВ (2x2 GRID) ==================== -->
  <g id="04. Карточки преимуществ" transform="translate(45, 1260)">
    <text x="461" y="0" text-anchor="middle" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900" letter-spacing="2">
      ПРЕИМУЩЕСТВА ЦЕНТРА <tspan fill="#00FFFF">СПАРТА</tspan>
    </text>

    <g transform="translate(0, 25)">
      <!-- 1. Пробная 0 ₽ -->
      <g transform="translate(0, 0)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#FFD700" stroke-width="2"/>
        <image href="${iconGiftB64}" xlink:href="${iconGiftB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Пробная</text>
        <text x="116" y="88" fill="#FFD700" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">тренировка 0 ₽</text>
      </g>

      <!-- 2. Заморозка -->
      <g transform="translate(477, 0)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#26C6DA" stroke-width="2"/>
        <image href="${iconIceB64}" xlink:href="${iconIceB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Заморозка</text>
        <text x="116" y="88" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">при болезни</text>
      </g>

      <!-- 3. Гос лицензия -->
      <g transform="translate(0, 138)">
        <rect width="445" height="120" rx="22" fill="#081E30" fill-opacity="0.90" stroke="#26C6DA" stroke-width="2"/>
        <image href="${iconLicenseB64}" xlink:href="${iconLicenseB64}" x="16" y="17" width="86" height="86" preserveAspectRatio="xMidYMid meet" filter="url(#iconShadow)"/>
        <text x="116" y="52" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">Государственная</text>
        <text x="116" y="88" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="26" font-weight="900">лицензия</text>
      </g>

      <!-- 4. Налоговый вычет 13% -->
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

    <g id="Контакты" transform="translate(30, 48)">
      <circle cx="27" cy="27" r="27" fill="rgba(38, 198, 218, 0.18)" stroke="#26C6DA" stroke-width="2"/>
      <path d="M35 30.5V33.5C35 34.5 34 35.5 33 35.5C24 35 19 30 18.5 21C18.5 20 19.5 19 20.5 19H23.5C24.5 19 25.3 19.8 25.5 20.8C25.7 22 26.2 23.2 26.9 24.2C27.4 24.9 27.2 25.8 26.5 26.3L25.2 27.3C26.4 29.5 28.5 31.6 30.7 32.8L31.7 31.5C32.2 30.8 33.1 30.6 33.8 31.1C34.8 31.8 36 32.3 37.2 32.5C38.2 32.7 39 33.5 39 34.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

      <text x="76" y="26" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">+7 919 339 33 99 (Директор)</text>
      <text x="76" y="60" fill="#FFFFFF" font-family="'Montserrat', sans-serif" font-size="21" font-weight="700">+7 (351) 230-12-69 (Админ)</text>
      <text x="76" y="94" fill="#00FFFF" font-family="'Montserrat', sans-serif" font-size="19.5" font-weight="600">bugrova.k@bk.ru</text>
    </g>

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
</svg>`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/sparta-duo-rollup-vector.svg'), svgContent, 'utf8');
fs.writeFileSync(path.resolve(__dirname, '../public/sparta-duo-rollup-master.svg'), svgContent, 'utf8');

console.log('✅ HTML & SVG generated with scaled and centered heroes!');
