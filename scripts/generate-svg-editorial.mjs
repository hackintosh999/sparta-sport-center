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

const logoB64 = getBase64('public/logo-gold.png');
const dancerPhotoB64 = getBase64('public/banner-assets/dance-contemporary-soma.jpg');
const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <filter id="photoShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="#2C3539" flood-opacity="0.12"/>
    </filter>
    <filter id="pillShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#D2E3C8" flood-opacity="0.5"/>
    </filter>
    <clipPath id="capsuleClip">
      <rect width="540" height="720" rx="36"/>
    </clipPath>
  </defs>

  <!-- Background Base Pearl-White -->
  <rect width="1240" height="1754" fill="#F4F4F6"/>

  <!-- Watercolor Haze Gradients -->
  <circle cx="200" cy="250" r="400" fill="#D2E3C8" opacity="0.35" filter="blur(80px)"/>
  <circle cx="1050" cy="550" r="425" fill="#E2D4F0" opacity="0.45" filter="blur(80px)"/>
  <circle cx="600" cy="1500" r="400" fill="#D2E3C8" opacity="0.25" filter="blur(80px)"/>

  <!-- ================= 1. TOP BRAND ZONE ================= -->
  <g transform="translate(620, 90)" text-anchor="middle">
    <image href="${logoB64}" x="-170" y="-16" width="32" height="32" opacity="0.9"/>
    <text x="20" y="7" text-anchor="middle" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="13" font-weight="600" letter-spacing="4">
      ЦСП «СПАРТА» • АКАДЕМИЯ ТАНЦА
    </text>
  </g>

  <!-- ================= 2. CENTER VISUAL ZONE: SOLO DANCER CAPSULE ================= -->
  <g transform="translate(620, 560)">
    <!-- Back Lilac Circle (Floating effect) -->
    <circle cx="25" cy="-15" r="310" fill="#E2D4F0" opacity="0.65" filter="blur(10px)"/>
    <!-- Back Pistachio Ring -->
    <circle cx="-30" cy="20" r="290" fill="none" stroke="#D2E3C8" stroke-width="1.5" opacity="0.8"/>

    <!-- Front Geometric Capsule Photo -->
    <g transform="translate(-270, -360)" filter="url(#photoShadow)">
      <g clip-path="url(#capsuleClip)">
        <image href="${dancerPhotoB64}" x="0" y="0" width="540" height="720" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <rect width="540" height="720" rx="36" fill="none" stroke="rgba(255, 255, 255, 0.95)" stroke-width="2"/>
    </g>
  </g>

  <!-- ================= 3. BOTTOM INFO ZONE ================= -->
  <g transform="translate(620, 1080)" text-anchor="middle">
    <!-- Main Headline -->
    <text x="0" y="0" fill="#2C3539" font-family="Playfair Display, serif" font-size="33" font-weight="600" letter-spacing="3.5">
      ВСЕРОССИЙСКАЯ ШКОЛА БАЛЕТА
    </text>
    <text x="0" y="42" fill="#2C3539" font-family="Playfair Display, serif" font-size="33" font-weight="600" letter-spacing="3.5">
      И СОВРЕМЕННОГО ТАНЦА
    </text>

    <!-- 3 Pistachio Disciplines Pills -->
    <g transform="translate(0, 85)">
      <!-- Pill 1 -->
      <g transform="translate(-380, 0)" filter="url(#pillShadow)">
        <rect width="235" height="46" rx="23" fill="#D2E3C8" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
        <text x="117.5" y="28" text-anchor="middle" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="600" letter-spacing="0.5">Классическая хореография</text>
      </g>
      <!-- Pill 2 -->
      <g transform="translate(-130, 0)" filter="url(#pillShadow)">
        <rect width="280" height="46" rx="23" fill="#D2E3C8" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
        <text x="140" y="28" text-anchor="middle" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="600" letter-spacing="0.5">Современный танец &amp; Contemporary</text>
      </g>
      <!-- Pill 3 -->
      <g transform="translate(165, 0)" filter="url(#pillShadow)">
        <rect width="215" height="46" rx="23" fill="#D2E3C8" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
        <text x="107.5" y="28" text-anchor="middle" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="600" letter-spacing="0.5">Детский балет (от 3-х лет)</text>
      </g>
    </g>

    <!-- Accent Line -->
    <text x="0" y="195" fill="#3A4E38" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="700" letter-spacing="3.5">
      ✦ ОТКРЫТ НАБОР НА НОВЫЙ СЕЗОН ✦
    </text>
  </g>

  <!-- ================= 4. FOOTER WITH THIN PISTACHIO DIVIDER ================= -->
  <g transform="translate(80, 1580)">
    <!-- Thin Pistachio Line -->
    <line x1="0" y1="0" x2="1080" y2="0" stroke="#D2E3C8" stroke-width="1.5"/>

    <!-- Left Contacts -->
    <g transform="translate(0, 30)">
      <text x="0" y="16" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="700" letter-spacing="1">ЗАПИСЬ НА ПРОБНОЕ ЗАНЯТИЕ:</text>
      <text x="0" y="44" fill="#5C676C" font-family="Montserrat, sans-serif" font-size="15" font-weight="500">
        <tspan fill="#2C3539" font-weight="700">+7 (919) 339-33-99</tspan> • <tspan fill="#2C3539" font-weight="700">+7 (351) 230-12-69</tspan>
      </text>
      <text x="0" y="70" fill="#5C676C" font-family="Montserrat, sans-serif" font-size="13" font-weight="500">
        📍 Новосибирск: ул. Большевистская, 125 • ул. Планетная, 53 • ул. Мясниковой, 25/2
      </text>
    </g>

    <!-- Right QR Code -->
    <g transform="translate(860, 20)">
      <rect width="68" height="68" rx="12" fill="#FFFFFF" stroke="#E2D4F0" stroke-width="1.5"/>
      <image href="${realQrB64}" x="4" y="4" width="60" height="60"/>
      <g transform="translate(80, 20)">
        <text x="0" y="16" fill="#2C3539" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="700" letter-spacing="0.5">vk.ru/sparta_fk</text>
        <text x="0" y="36" fill="#5C676C" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="500">Наведите камеру смартфона</text>
      </g>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/dance-editorial-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated dance-editorial-banner.svg according to the new Editorial Brief!');
