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

const silkBgB64 = getBase64('public/banner-assets/dance-silk-bg.jpg');
const logoB64 = getBase64('public/logo-gold.png');
const ballerinaCutoutB64 = getBase64('public/banner-assets/dancer-ballerina-cutout.png');
const contemporaryCutoutB64 = getBase64('public/banner-assets/dancer-contemporary-cutout.png');
const ballerinaBarreB64 = getBase64('public/banner-assets/dance-ballerina-lotus.jpg');
const dynamicsB64 = getBase64('public/sparta_real_dynamics.jpg');
const awardB64 = getBase64('public/sparta_real_award.jpg');
const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <filter id="tagShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
    <filter id="dancerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
    <filter id="orbitShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.22"/>
    </filter>
    <filter id="footerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
    <clipPath id="circleClip155">
      <circle cx="77.5" cy="77.5" r="77.5"/>
    </clipPath>
    <clipPath id="circleClip140">
      <circle cx="70" cy="70" r="70"/>
    </clipPath>
  </defs>

  <!-- Background Silk Texture -->
  <image href="${silkBgB64}" x="0" y="0" width="1240" height="1754" preserveAspectRatio="xMidYMid slice" opacity="0.88"/>
  <circle cx="620" cy="550" r="500" fill="#FFFFFF" opacity="0.68" filter="blur(60px)"/>

  <!-- Mint & Lavender Light Beams -->
  <circle cx="280" cy="600" r="260" fill="#8DAE92" opacity="0.32" filter="blur(50px)"/>
  <circle cx="960" cy="600" r="260" fill="#9A9EBE" opacity="0.32" filter="blur(50px)"/>

  <!-- ================= 1. HEADER ================= -->
  <g transform="translate(620, 50)" text-anchor="middle">
    <!-- Brand Top Badge -->
    <g transform="translate(-240, 0)">
      <rect width="480" height="42" rx="21" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" stroke-width="1.5"/>
      <image href="${logoB64}" x="16" y="9" width="24" height="24"/>
      <text x="255" y="27" text-anchor="middle" fill="#2D3530" font-family="Montserrat, sans-serif" font-size="13" font-weight="800" letter-spacing="2">ВСЕРОССИЙСКАЯ ШКОЛА ТАНЦА • ЦСП «СПАРТА»</text>
    </g>

    <!-- Main Title -->
    <text x="0" y="95" fill="#1A1D24" font-family="Montserrat, sans-serif" font-size="44" font-weight="900" letter-spacing="1">
      <tspan fill="#234E35">БАЛЕТ LOTUS</tspan> &amp; <tspan fill="#4A3B69">ХОРЕОГРАФИЯ SoMA</tspan>
    </text>
    <text x="0" y="132" fill="#3D4440" font-family="Montserrat, sans-serif" font-size="17" font-weight="800" letter-spacing="1">
      ОТКРЫВАЕМ НАБОР НА НОВЫЙ СЕЗОН • ДЕТИ И ПОДРОСТКИ
    </text>
  </g>

  <!-- ================= 2. CUTOUT DANCERS, ORBITS & BENEFIT TAGS ================= -->
  <g transform="translate(0, 220)">
    
    <!-- Cutout Ballerina (Left) -->
    <g transform="translate(75, 0)" filter="url(#dancerShadow)">
      <image href="${ballerinaCutoutB64}" x="0" y="0" width="520" height="700" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Cutout Contemporary Dancer (Right) -->
    <g transform="translate(640, 25)" filter="url(#dancerShadow)">
      <image href="${contemporaryCutoutB64}" x="0" y="0" width="530" height="680" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- LIVE-MOMENT ORBIT CIRCLES -->
    <!-- Circle 1: Barre coach (Left) -->
    <g transform="translate(20, 190) rotate(-4)" filter="url(#orbitShadow)">
      <g clip-path="url(#circleClip155)">
        <image href="${ballerinaBarreB64}" x="-20" y="0" width="200" height="155" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <circle cx="77.5" cy="77.5" r="77.5" fill="none" stroke="#FFFFFF" stroke-width="3.5"/>
    </g>

    <!-- Circle 2: Dance group rehearsal (Right) -->
    <g transform="translate(1060, 190) rotate(4)" filter="url(#orbitShadow)">
      <g clip-path="url(#circleClip155)">
        <image href="${dynamicsB64}" x="0" y="0" width="155" height="155" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <circle cx="77.5" cy="77.5" r="77.5" fill="none" stroke="#FFFFFF" stroke-width="3.5"/>
    </g>

    <!-- Circle 3: Award concert diplomas (Center Bottom) -->
    <g transform="translate(550, 560)" filter="url(#orbitShadow)">
      <g clip-path="url(#circleClip140)">
        <image href="${awardB64}" x="0" y="0" width="140" height="140" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <circle cx="70" cy="70" r="70" fill="none" stroke="#FFFFFF" stroke-width="4"/>
    </g>

    <!-- LEFT VALUE TAGS (LOTUS) -->
    <!-- Tag 1 Header -->
    <g transform="translate(45, 15)" filter="url(#tagShadow)">
      <rect width="250" height="42" rx="21" fill="#FFFFFF" stroke="#8DAE92" stroke-width="2"/>
      <text x="25" y="27" fill="#234E35" font-family="Montserrat, sans-serif" font-size="16" font-weight="900">🩰 Школа балета Lotus</text>
    </g>
    <!-- Tag 2 Posture -->
    <g transform="translate(15, 375)" filter="url(#tagShadow)">
      <rect width="290" height="54" rx="27" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5"/>
      <text x="18" y="34" font-size="20">🩰</text>
      <text x="48" y="25" fill="#1A1D24" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">Здоровая осанка и лёгкость</text>
      <text x="48" y="42" fill="#68746E" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="600">Бережная растяжка без боли и слёз</text>
    </g>
    <!-- Tag 3 Musicality -->
    <g transform="translate(40, 590)" filter="url(#tagShadow)">
      <rect width="270" height="54" rx="27" fill="#234E35" stroke="#FFFFFF" stroke-width="2"/>
      <text x="18" y="34" font-size="20">🎵</text>
      <text x="48" y="25" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">Музыкальность и грация</text>
      <text x="48" y="42" fill="#D2E4D8" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="600">Развиваем слух и плавность</text>
    </g>

    <!-- RIGHT VALUE TAGS (SOMA) -->
    <!-- Tag 1 Header -->
    <g transform="translate(940, 15)" filter="url(#tagShadow)">
      <rect width="245" height="42" rx="21" fill="#FFFFFF" stroke="#9A9EBE" stroke-width="2"/>
      <text x="25" y="27" fill="#4A3B69" font-family="Montserrat, sans-serif" font-size="16" font-weight="900">✨ Хореография SoMA</text>
    </g>
    <!-- Tag 2 Confidence -->
    <g transform="translate(930, 375)" filter="url(#tagShadow)">
      <rect width="295" height="54" rx="27" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5"/>
      <text x="18" y="34" font-size="20">⚡</text>
      <text x="48" y="25" fill="#1A1D24" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">Уверенность и раскованность</text>
      <text x="48" y="42" fill="#68746E" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="600">Снимаем зажимы, учим владеть телом</text>
    </g>
    <!-- Tag 3 Battles -->
    <g transform="translate(930, 590)" filter="url(#tagShadow)">
      <rect width="280" height="54" rx="27" fill="#4A3B69" stroke="#FFFFFF" stroke-width="2"/>
      <text x="18" y="34" font-size="20">🏆</text>
      <text x="48" y="25" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="800">Ритм, сцена и баттлы</text>
      <text x="48" y="42" fill="#E2DBF0" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="600">Выступления и мощный заряд энергии</text>
    </g>

  </g>

  <!-- ================= 3. EMPOWER MESSAGE & SOUL TEXT ================= -->
  <g transform="translate(620, 975)" text-anchor="middle">
    <text x="0" y="30" fill="#1A1D24" font-family="Montserrat, sans-serif" font-size="26" font-weight="800">
      Вдохновляем на танец через радость и бережный подход
    </text>
    <text x="0" y="64" fill="#4A5650" font-family="Montserrat, sans-serif" font-size="16.5" font-weight="600">
      «Помогаем раскрыть природную грацию, пластику и уверенность в себе. Создаём пространство,
    </text>
    <text x="0" y="90" fill="#4A5650" font-family="Montserrat, sans-serif" font-size="16.5" font-weight="600">
      где берегут детское здоровье, учат слышать музыку и искренне радоваться каждому движению.»
    </text>
  </g>

  <!-- ================= 4. UNIFIED GRAPHITE FOOTER CARD ================= -->
  <g transform="translate(48, 1115)" filter="url(#footerShadow)">
    <rect width="1144" height="235" rx="26" fill="#181E1B" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>

    <!-- Top Action Row -->
    <g transform="translate(30, 24)">
      <!-- Free Offer Badge -->
      <rect width="380" height="66" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
      <text x="25" y="44" font-size="30">🎁</text>
      <text x="75" y="30" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="17" font-weight="900">0 ₽ — Пробное занятие</text>
      <text x="75" y="52" fill="#C0CCC5" font-family="Montserrat, sans-serif" font-size="13" font-weight="600">Знакомство с педагогом и студией</text>

      <!-- CTA Button -->
      <g transform="translate(410, 0)">
        <rect width="674" height="66" rx="33" fill="#8DAE92" stroke="#FFFFFF" stroke-width="2"/>
        <text x="337" y="42" text-anchor="middle" fill="#142018" font-family="Montserrat, sans-serif" font-size="17" font-weight="900" letter-spacing="1">
          ЗАПИСАТЬСЯ НА ПРОБНОЕ ЗАНЯТИЕ →
        </text>
      </g>
    </g>

    <!-- Divider Line -->
    <line x1="30" y1="112" x2="1114" y2="112" stroke="rgba(255,255,255,0.12)"/>

    <!-- Bottom Info Row -->
    <g transform="translate(30, 134)">
      <!-- Branches -->
      <g transform="translate(0, 0)">
        <text x="0" y="16" fill="#A6C4AB" font-family="Montserrat, sans-serif" font-size="12.5" font-weight="800" letter-spacing="1">📍 ФИЛИАЛЫ В НОВОСИБИРСКЕ:</text>
        <text x="0" y="40" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="700">• ул. Большевистская, 125  • ул. Планетная, 53</text>
        <text x="0" y="64" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14.5" font-weight="700">• ул. Мясниковой, 25/2</text>
      </g>

      <!-- Phones -->
      <g transform="translate(540, 0)">
        <line x1="-30" y1="0" x2="-30" y2="70" stroke="rgba(255,255,255,0.12)"/>
        <text x="0" y="24" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">
          <tspan fill="#A6C4AB" font-size="12">ДИРЕКТОР: </tspan>+7 (919) 339-33-99
        </text>
        <text x="0" y="54" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="800">
          <tspan fill="#A6C4AB" font-size="12">АДМИНИСТРАТОР: </tspan>+7 (351) 230-12-69
        </text>
        <line x1="280" y1="0" x2="280" y2="70" stroke="rgba(255,255,255,0.12)"/>
      </g>

      <!-- QR Code -->
      <g transform="translate(860, 0)">
        <rect x="0" y="0" width="70" height="70" rx="10" fill="#FFFFFF"/>
        <image href="${realQrB64}" x="5" y="5" width="60" height="60"/>
        <g transform="translate(82, 18)">
          <text x="0" y="16" fill="#A6C4AB" font-family="Montserrat, sans-serif" font-size="15.5" font-weight="900">vk.ru/sparta_fk</text>
          <text x="0" y="36" fill="#C0CCC5" font-family="Montserrat, sans-serif" font-size="11.5" font-weight="600">Наведите камеру смартфона</text>
        </g>
      </g>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/dance-lotus-soma-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated dance-lotus-soma-banner.svg with live orbits!');
