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

const stadiumB64 = getBase64('public/banner-assets/field-stadium-bg.jpg');
const logoB64 = getBase64('public/logo-gold.png');
const boyB64 = getBase64('public/banner-assets/sparta-boy-soccer.jpg');
const trainingB64 = getBase64('public/sparta_real_dynamics.jpg');
const iconZeroB64 = getBase64('public/banner-assets/icon-3d-zero.jpg');
const iconGiftB64 = getBase64('public/banner-assets/icon-3d-gift.jpg');
const iconFreezeB64 = getBase64('public/banner-assets/icon-3d-freeze.jpg');
const iconLicenseB64 = getBase64('public/banner-assets/icon-3d-license.jpg');
const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="15" stdDeviation="15" flood-color="#000000" flood-opacity="0.85"/>
    </filter>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#E2F806" flood-opacity="0.4"/>
    </filter>
    <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="#FFC72C" flood-opacity="0.6"/>
    </filter>

    <clipPath id="heroBoyClip">
      <rect width="490" height="540" rx="20"/>
    </clipPath>
    <clipPath id="teamTrainClip">
      <rect width="480" height="280" rx="18"/>
    </clipPath>
    <clipPath id="iconClip">
      <rect width="68" height="68" rx="14"/>
    </clipPath>
  </defs>

  <!-- Background Image Stadium -->
  <image href="${stadiumB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice" opacity="0.95"/>

  <!-- Top Dark Gradient Overlay -->
  <rect width="1240" height="650" fill="url(#topOverlayGrad)"/>
  <linearGradient id="topOverlayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#030810" stop-opacity="0.98"/>
    <stop offset="65%" stop-color="#050D15" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#050D15" stop-opacity="0"/>
  </linearGradient>

  <!-- ================= 1. TOP HEADLINE & GOLD CREST ================= -->
  <g transform="translate(60, 40)">
    <!-- Brand Pill -->
    <rect width="320" height="36" rx="18" fill="#081018" stroke="#E2F806" stroke-width="1.5"/>
    <text x="160" y="23" text-anchor="middle" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="13.5" font-weight="800" letter-spacing="1.5">ЦСП «СПАРТА» • НОВОСИБИРСК</text>

    <!-- H1 Lines -->
    <text x="0" y="95" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="52" font-weight="900" font-style="italic">ФУТБОЛ ДЛЯ ДЕТЕЙ</text>
    <text x="0" y="175" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="86" font-weight="900" font-style="italic" filter="url(#neonGlow)">ЦСП «СПАРТА»</text>
    <text x="0" y="235" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="56" font-weight="900" font-style="italic">ОТКРЫВАЕТ НАБОР</text>

    <!-- Slogan Box -->
    <g transform="translate(0, 255) skewX(-12)">
      <rect width="280" height="36" rx="6" fill="#E2F806"/>
      <text x="140" y="24" text-anchor="middle" fill="#050D15" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="900" font-style="italic">ИГРАЙ. УЧИСЬ. ПОБЕЖДАЙ.</text>
    </g>

    <!-- Soul Text Box -->
    <g transform="translate(0, 310)">
      <rect width="720" height="74" rx="12" fill="#081018" fill-opacity="0.85"/>
      <line x1="0" y1="0" x2="0" y2="74" stroke="#E2F806" stroke-width="5"/>
      <text x="20" y="30" fill="#F8F9FA" font-family="Onest, sans-serif" font-size="20" font-weight="700">Учим любить футбол, играть в команде и верить в свои силы.</text>
      <text x="20" y="58" fill="#F8F9FA" font-family="Onest, sans-serif" font-size="20" font-weight="700">Создаём атмосферу, куда ребёнок бежит с удовольствием.</text>
    </g>
  </g>

  <!-- Top Right Gold Crest -->
  <g transform="translate(1010, 35)">
    <circle cx="85" cy="85" r="100" fill="#FFC72C" opacity="0.35" filter="blur(20px)"/>
    <image href="${logoB64}" x="5" y="5" width="160" height="160" filter="url(#goldGlow)"/>
  </g>

  <!-- ================= 2. AGE RIBBON ================= -->
  <g transform="translate(60, 490) skewX(-10)">
    <rect width="460" height="52" rx="10" fill="#E2F806" filter="url(#dropShadow)"/>
    <text x="230" y="35" text-anchor="middle" fill="#050D15" font-family="Montserrat, sans-serif" font-size="24" font-weight="900" font-style="italic">ДЛЯ ДЕТЕЙ ОТ 4 ДО 14 ЛЕТ</text>
  </g>

  <!-- ================= 3. MAIN BODY (2 COLUMNS) ================= -->
  <!-- LEFT COLUMN: 4 CARE CARDS + VENUE + CTA -->
  <g transform="translate(60, 565)">
    
    <!-- Card 1: 0 Rubles -->
    <g transform="translate(0, 0)" filter="url(#dropShadow)">
      <rect width="590" height="84" rx="12" fill="#081018" fill-opacity="0.95"/>
      <line x1="0" y1="0" x2="0" y2="84" stroke="#E2F806" stroke-width="6"/>
      <g transform="translate(18, 8)">
        <rect width="68" height="68" rx="14" fill="#04090F" stroke="#E2F806" stroke-width="2"/>
        <g clip-path="url(#iconClip)">
          <image href="${iconZeroB64}" x="0" y="0" width="68" height="68" preserveAspectRatio="xMidYMid slice"/>
        </g>
      </g>
      <text x="102" y="36" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="20.5" font-weight="900">0 ₽ — ПРОБНОЕ ЗАНЯТИЕ</text>
      <text x="102" y="62" fill="#F0F4F2" font-family="Onest, sans-serif" font-size="15" font-weight="600">Первая тренировка и знакомство с тренером бесплатно</text>
    </g>

    <!-- Card 2: Ball Gift -->
    <g transform="translate(0, 96)" filter="url(#dropShadow)">
      <rect width="590" height="84" rx="12" fill="#081018" fill-opacity="0.95"/>
      <line x1="0" y1="0" x2="0" y2="84" stroke="#E2F806" stroke-width="6"/>
      <g transform="translate(18, 8)">
        <rect width="68" height="68" rx="14" fill="#04090F" stroke="#E2F806" stroke-width="2"/>
        <g clip-path="url(#iconClip)">
          <image href="${iconGiftB64}" x="0" y="0" width="68" height="68" preserveAspectRatio="xMidYMid slice"/>
        </g>
      </g>
      <text x="102" y="36" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="20.5" font-weight="900">МЯЧ В ПОДАРОК ⚽</text>
      <text x="102" y="62" fill="#F0F4F2" font-family="Onest, sans-serif" font-size="15" font-weight="600">Фирменный мяч SPARTA к первому абонементу</text>
    </g>

    <!-- Card 3: Subscription Freeze During Illness -->
    <g transform="translate(0, 192)" filter="url(#dropShadow)">
      <rect width="590" height="84" rx="12" fill="#081018" fill-opacity="0.95"/>
      <line x1="0" y1="0" x2="0" y2="84" stroke="#E2F806" stroke-width="6"/>
      <g transform="translate(18, 8)">
        <rect width="68" height="68" rx="14" fill="#04090F" stroke="#E2F806" stroke-width="2"/>
        <g clip-path="url(#iconClip)">
          <image href="${iconFreezeB64}" x="0" y="0" width="68" height="68" preserveAspectRatio="xMidYMid slice"/>
        </g>
      </g>
      <text x="102" y="36" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="20.5" font-weight="900">ЗАМОРОЗКА ПРИ БОЛЕЗНИ ❄️</text>
      <text x="102" y="62" fill="#F0F4F2" font-family="Onest, sans-serif" font-size="15" font-weight="600">Бесплатная заморозка занятий — абонемент не сгорает</text>
    </g>

    <!-- Card 4: License & Tax Deduction -->
    <g transform="translate(0, 288)" filter="url(#dropShadow)">
      <rect width="590" height="84" rx="12" fill="#081018" fill-opacity="0.95"/>
      <line x1="0" y1="0" x2="0" y2="84" stroke="#E2F806" stroke-width="6"/>
      <g transform="translate(18, 8)">
        <rect width="68" height="68" rx="14" fill="#04090F" stroke="#E2F806" stroke-width="2"/>
        <g clip-path="url(#iconClip)">
          <image href="${iconLicenseB64}" x="0" y="0" width="68" height="68" preserveAspectRatio="xMidYMid slice"/>
        </g>
      </g>
      <text x="102" y="36" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="20.5" font-weight="900">ГОСЛИЦЕНЗИЯ (ВЫЧЕТ 13%)</text>
      <text x="102" y="62" fill="#F0F4F2" font-family="Onest, sans-serif" font-size="15" font-weight="600">Официальный возврат налогов + материнский капитал</text>
    </g>

    <!-- Venue Card -->
    <g transform="translate(0, 386)" filter="url(#dropShadow)">
      <rect width="590" height="96" rx="14" fill="#E2F806"/>
      <text x="24" y="32" fill="#050D15" font-family="Montserrat, sans-serif" font-size="15" font-weight="900" letter-spacing="1">📍 ФИЛИАЛЫ В НОВОСИБИРСКЕ:</text>
      <text x="24" y="58" fill="#050D15" font-family="Montserrat, sans-serif" font-size="16.5" font-weight="900">• ул. Большевистская, 125  • ул. Планетная, 53</text>
      <text x="24" y="82" fill="#050D15" font-family="Montserrat, sans-serif" font-size="16.5" font-weight="900">• ул. Мясниковой, 25/2</text>
    </g>

    <!-- CTA Button -->
    <g transform="translate(0, 496)" filter="url(#neonGlow)">
      <rect width="590" height="72" rx="36" fill="#FFE600" stroke="#FFFFFF" stroke-width="3"/>
      <text x="295" y="45" text-anchor="middle" fill="#050D15" font-family="Montserrat, sans-serif" font-size="19" font-weight="900" letter-spacing="1">
        ЗАПИСАТЬСЯ НА БЕСПЛАТНЫЙ УРОК →
      </text>
    </g>
  </g>

  <!-- RIGHT COLUMN: 2 PROPORTIONAL SPORT FRAMES -->
  <g transform="translate(680, 565)">
    <!-- 1. Hero Boy Soccer Frame (Portrait 3:4 Proportions) -->
    <g transform="rotate(-3)" filter="url(#dropShadow)">
      <rect width="490" height="540" rx="20" fill="#04090F" stroke="#E2F806" stroke-width="5"/>
      <g clip-path="url(#heroBoyClip)">
        <image href="${boyB64}" x="0" y="0" width="490" height="540" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <!-- Badge -->
      <g transform="translate(270, 480)">
        <rect width="190" height="40" rx="20" fill="#050D15" stroke="#E2F806" stroke-width="2"/>
        <text x="95" y="25" text-anchor="middle" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="13" font-weight="900">ЦСП СПАРТА • 2026</text>
      </g>
    </g>

    <!-- 2. Training Action Frame (16:9 Widescreen Proportions) -->
    <g transform="translate(-20, 500) rotate(3.5)" filter="url(#dropShadow)">
      <rect width="480" height="280" rx="18" fill="#04090F" stroke="#FFE600" stroke-width="5"/>
      <g clip-path="url(#teamTrainClip)">
        <image href="${trainingB64}" x="0" y="0" width="480" height="280" preserveAspectRatio="xMidYMid slice"/>
      </g>
    </g>
  </g>

  <!-- ================= 4. BOTTOM CONTACTS BAR ================= -->
  <g transform="translate(60, 1600)" filter="url(#dropShadow)">
    <rect width="1120" height="106" rx="20" fill="#04090F" stroke="#E2F806" stroke-width="2" stroke-opacity="0.35"/>

    <!-- Director Phone -->
    <g transform="translate(30, 34)">
      <text x="0" y="16" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="12.5" font-weight="800" letter-spacing="1">ДИРЕКТОР ЦСП «СПАРТА»:</text>
      <text x="0" y="44" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="19" font-weight="900">+7 (919) 339-33-99</text>
    </g>

    <line x1="330" y1="28" x2="330" y2="78" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>

    <!-- Admin Phone -->
    <g transform="translate(360, 34)">
      <text x="0" y="16" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="12.5" font-weight="800" letter-spacing="1">АДМИНИСТРАТОР:</text>
      <text x="0" y="44" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="19" font-weight="900">+7 (351) 230-12-69</text>
    </g>

    <line x1="680" y1="28" x2="680" y2="78" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>

    <!-- QR Code & Link -->
    <g transform="translate(710, 14)">
      <rect width="78" height="78" rx="12" fill="#FFFFFF"/>
      <image href="${realQrB64}" x="5" y="5" width="68" height="68"/>
      <g transform="translate(94, 20)">
        <text x="0" y="18" fill="#E2F806" font-family="Montserrat, sans-serif" font-size="19" font-weight="900">vk.ru/sparta_fk</text>
        <text x="0" y="38" fill="#FFFFFF" font-family="Onest, sans-serif" font-size="13.5" font-weight="700">Официальное сообщество</text>
        <text x="0" y="54" fill="#B2C4D0" font-family="Onest, sans-serif" font-size="11.5">Наведите камеру смартфона</text>
      </g>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/sparta-summer-camp-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated sparta-summer-camp-banner.svg with fixed proportional frames and zero stretching!');
