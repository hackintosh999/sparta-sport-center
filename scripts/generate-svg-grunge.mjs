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

const boyB64 = getBase64('public/banner-assets/sparta-boy-soccer.jpg');
const logoB64 = getBase64('public/logo-gold.png');
const polaroid1B64 = getBase64('public/sparta_real_dynamics.jpg');
const polaroid2B64 = getBase64('public/benefit_physics.jpg');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <linearGradient id="tapeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD000"/>
      <stop offset="100%" stop-color="#FFB700"/>
    </linearGradient>

    <radialGradient id="stickerGrad" cx="35%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#FFE169"/>
      <stop offset="50%" stop-color="#FFC72C"/>
      <stop offset="100%" stop-color="#E69D00"/>
    </radialGradient>

    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="15" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1240" height="1754" fill="#111412"/>
  <circle cx="950" cy="300" r="400" fill="#FF6B00" fill-opacity="0.35"/>
  <circle cx="200" cy="1200" r="450" fill="#FFC72C" fill-opacity="0.25"/>

  <!-- Center Hero Boy Photo (Embedded) -->
  <g transform="translate(40, 310)">
    <circle cx="340" cy="450" r="320" fill="#FF6B00" fill-opacity="0.4"/>
    <image href="${boyB64}" x="0" y="0" width="700" height="1020" preserveAspectRatio="xMidYMid slice"/>
  </g>

  <!-- Top-Right Diagonal Yellow Tape -->
  <g transform="rotate(-5 620 200)" filter="url(#cardShadow)">
    <polygon points="320,80 1280,80 1260,310 300,310" fill="url(#tapeGrad)"/>
    <text x="360" y="240" fill="#1A1708" font-family="Arial Black, Impact, sans-serif" font-size="105" font-weight="900" letter-spacing="4">
      ФУТБОЛ
    </text>
    <text x="500" y="305" fill="#FFFFFF" stroke="#1A1708" stroke-width="4" paint-order="stroke fill" font-family="Brush Script MT, cursive, sans-serif" font-size="110" font-weight="700">
      набор детей
    </text>
  </g>

  <!-- Top-Left White Torn Paper Logo -->
  <g transform="rotate(-3 180 80)" filter="url(#cardShadow)">
    <polygon points="0,0 440,0 420,180 390,210 240,195 100,215 0,190" fill="#FFFFFF"/>
    <image href="${logoB64}" x="25" y="45" width="80" height="80"/>
    <text x="120" y="85" fill="#0B0F0D" font-family="Arial Black, sans-serif" font-size="28" font-weight="900">СПАРТА</text>
    <text x="120" y="112" fill="#FF6B00" font-family="Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="2">ФУТБОЛЬНЫЙ ЦЕНТР</text>
  </g>

  <!-- Polaroid 1 (Right) -->
  <g transform="translate(740, 390) rotate(4)" filter="url(#cardShadow)">
    <rect width="440" height="320" rx="6" fill="#FFFFFF"/>
    <image href="${polaroid1B64}" x="16" y="16" width="408" height="240" preserveAspectRatio="xMidYMid slice"/>
    <text x="220" y="295" text-anchor="middle" fill="#111412" font-family="Arial, sans-serif" font-size="20" font-weight="700">
      Командный дух и дружба ✨
    </text>
  </g>

  <!-- Polaroid 2 (Right) -->
  <g transform="translate(730, 730) rotate(-3)" filter="url(#cardShadow)">
    <rect width="450" height="330" rx="6" fill="#FFFFFF"/>
    <image href="${polaroid2B64}" x="16" y="16" width="418" height="250" preserveAspectRatio="xMidYMid slice"/>
    <text x="225" y="305" text-anchor="middle" fill="#111412" font-family="Arial, sans-serif" font-size="20" font-weight="700">
      Техника &amp; Профессионализм ⚽
    </text>
  </g>

  <!-- Dark Torn Info Plate (Left Bottom) -->
  <g transform="translate(50, 1220)" filter="url(#cardShadow)">
    <polygon points="0,15 200,0 450,10 580,0 570,250 380,265 150,255 0,265" fill="#141815"/>
    <line x1="0" y1="15" x2="0" y2="265" stroke="#FFC72C" stroke-width="8"/>
    <text x="35" y="60" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="20" font-weight="900">📅 Набор детей 4–14 лет</text>
    <text x="35" y="85" fill="#A0ABA4" font-family="Arial, sans-serif" font-size="14">Группы для новичков и продолжающих</text>
    <text x="35" y="135" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="20" font-weight="900">📍 г. Новосибирск</text>
    <text x="35" y="160" fill="#A0ABA4" font-family="Arial, sans-serif" font-size="14">Манежи и залы рядом с вашим домом</text>
    <text x="35" y="210" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="20" font-weight="900">⭐ Лицензированные тренеры</text>
    <text x="35" y="235" fill="#A0ABA4" font-family="Arial, sans-serif" font-size="14">Индивидуальный подход к ребенку</text>
  </g>

  <!-- Round Sticker (0 Rub) -->
  <g transform="translate(680, 1220) rotate(-10)" filter="url(#cardShadow)">
    <circle cx="120" cy="120" r="120" fill="url(#stickerGrad)"/>
    <circle cx="120" cy="120" r="110" fill="none" stroke="#121513" stroke-width="2" stroke-dasharray="6 6" opacity="0.5"/>
    <text x="120" y="110" text-anchor="middle" fill="#0F1311" font-family="Arial Black, sans-serif" font-size="68" font-weight="900">0 ₽</text>
    <text x="120" y="145" text-anchor="middle" fill="#0F1311" font-family="Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="1">ПРОБНАЯ ТРЕНИРОВКА</text>
    <rect x="55" y="160" width="130" height="28" rx="14" fill="#0F1311"/>
    <text x="120" y="179" text-anchor="middle" fill="#FFC72C" font-family="Arial, sans-serif" font-size="13" font-weight="900">БЕСПЛАТНО</text>
  </g>

  <!-- QR Box -->
  <g transform="translate(980, 1220)" filter="url(#cardShadow)">
    <rect width="190" height="220" rx="16" fill="#FFFFFF"/>
    <text x="95" y="30" text-anchor="middle" fill="#0B0F0D" font-family="Arial Black, sans-serif" font-size="12" font-weight="900">ЗАПИСЬ ОНЛАЙН</text>
    <rect x="25" y="45" width="140" height="140" fill="#0B0F0D"/>
    <rect x="35" y="55" width="40" height="40" fill="white"/>
    <rect x="115" y="55" width="40" height="40" fill="white"/>
    <rect x="35" y="135" width="40" height="40" fill="white"/>
    <text x="95" y="205" text-anchor="middle" fill="#FF6B00" font-family="Arial, sans-serif" font-size="12" font-weight="800">sparta-sports.ru</text>
  </g>

  <!-- Bottom Contacts Bar -->
  <rect y="1654" width="1240" height="100" fill="#060907"/>
  <line x1="0" y1="1654" x2="1240" y2="1654" stroke="#FFC72C" stroke-width="2" opacity="0.4"/>
  <text x="60" y="1715" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="17" font-weight="700">
    🌐 sparta-sports.ru   ⚽ @sparta_novosibirsk   🎁 Мяч в подарок новичкам!
  </text>
  <text x="940" y="1715" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="20" font-weight="900">
    📞 +7 (383) 383-00-15
  </text>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/sparta-poster-grunge.svg'), svgContent, 'utf-8');
console.log('✅ Generated standalone self-contained sparta-poster-grunge.svg with embedded base64 images!');
