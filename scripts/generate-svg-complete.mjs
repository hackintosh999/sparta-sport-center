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

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1240" height="1754" viewBox="0 0 1240 1754">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF0B8"/>
      <stop offset="50%" stop-color="#FFC72C"/>
      <stop offset="100%" stop-color="#D49800"/>
    </linearGradient>

    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00D06C"/>
      <stop offset="60%" stop-color="#00A859"/>
      <stop offset="100%" stop-color="#00753E"/>
    </linearGradient>

    <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1240" height="1754" fill="#080C0A"/>

  <!-- Photo Layer with Stadium Light -->
  <g transform="translate(0, 360)">
    <circle cx="620" cy="300" r="450" fill="#FFC72C" fill-opacity="0.25"/>
    <image href="${boyB64}" x="0" y="0" width="1240" height="980" preserveAspectRatio="xMidYMid slice" opacity="0.95"/>
  </g>

  <!-- Top Dark Gradient Overlay -->
  <rect width="1240" height="420" fill="#080C0A" opacity="0.92"/>

  <!-- ================= 1. TOP HEADER ================= -->
  <g transform="translate(70, 45)">
    <!-- Logo & Brand Badge -->
    <image href="${logoB64}" x="0" y="0" width="75" height="75"/>
    <g transform="translate(95, 18)">
      <rect width="450" height="40" rx="20" fill="#141E18" stroke="#FFC72C" stroke-width="1.5"/>
      <circle cx="20" cy="20" r="4" fill="#00D06C"/>
      <text x="35" y="26" fill="#FFC72C" font-family="Arial, sans-serif" font-size="14" font-weight="900" letter-spacing="2">
        ЦСП «СПАРТА» • НАБОР ДЕТЕЙ ОТ 4 ДО 14 ЛЕТ
      </text>
    </g>

    <!-- Main Title -->
    <text x="550" y="145" text-anchor="middle" fill="#FFFFFF" font-family="Arial Black, Impact, sans-serif" font-size="40" font-weight="900">
      ФУТБОЛ ДЛЯ ДЕТЕЙ: <tspan fill="url(#goldGrad)">ЦСП «СПАРТА»</tspan>
    </text>
    <text x="550" y="195" text-anchor="middle" fill="#FFFFFF" font-family="Arial Black, Impact, sans-serif" font-size="40" font-weight="900">
      ОТКРЫВАЕТ НАБОР В <tspan fill="#00D06C">НОВОСИБИРСКЕ</tspan>
    </text>

    <!-- Soul Block -->
    <g transform="translate(50, 225)" filter="url(#boxShadow)">
      <rect width="1000" height="70" rx="14" fill="#0D130F" fill-opacity="0.85" stroke="#FFC72C" stroke-width="1"/>
      <line x1="0" y1="0" x2="0" y2="70" stroke="#FFC72C" stroke-width="6"/>
      <text x="30" y="32" fill="#E6EDE8" font-family="Arial, sans-serif" font-size="16" font-weight="600">
        Учим любить футбол, играть в команде и верить в свои силы.
      </text>
      <text x="30" y="54" fill="#E6EDE8" font-family="Arial, sans-serif" font-size="16" font-weight="600">
        Создаём атмосферу, куда ребёнок бежит с удовольствием на каждую тренировку.
      </text>
    </g>
  </g>

  <!-- ================= 2. CARE CARDS GRID (3 BADGES) ================= -->
  <g transform="translate(60, 1140)">
    <!-- Card 1 -->
    <g transform="translate(0, 0)" filter="url(#boxShadow)">
      <rect width="360" height="135" rx="18" fill="#0D130F" fill-opacity="0.92" stroke="#00D06C" stroke-width="1.5"/>
      <line x1="0" y1="0" x2="360" y2="0" stroke="url(#emeraldGrad)" stroke-width="4"/>
      <text x="25" y="45" fill="url(#emeraldGrad)" font-family="Arial Black, sans-serif" font-size="32" font-weight="900">0 ₽</text>
      <text x="25" y="75" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="17" font-weight="700">Пробное занятие</text>
      <text x="25" y="100" fill="#B5C4BB" font-family="Arial, sans-serif" font-size="13">Первая тренировка — бесплатно</text>
    </g>

    <!-- Card 2 -->
    <g transform="translate(380, 0)" filter="url(#boxShadow)">
      <rect width="360" height="135" rx="18" fill="#0D130F" fill-opacity="0.92" stroke="#FFC72C" stroke-width="1"/>
      <line x1="0" y1="0" x2="360" y2="0" stroke="url(#goldGrad)" stroke-width="4"/>
      <text x="25" y="45" fill="url(#goldGrad)" font-family="Arial Black, sans-serif" font-size="24" font-weight="900">Мяч в подарок ⚽</text>
      <text x="25" y="75" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="17" font-weight="700">Фирменный подарок</text>
      <text x="25" y="100" fill="#B5C4BB" font-family="Arial, sans-serif" font-size="13">Дарим мяч к первому абонементу</text>
    </g>

    <!-- Card 3 -->
    <g transform="translate(760, 0)" filter="url(#boxShadow)">
      <rect width="360" height="135" rx="18" fill="#0D130F" fill-opacity="0.92" stroke="#FFC72C" stroke-width="1"/>
      <line x1="0" y1="0" x2="360" y2="0" stroke="url(#goldGrad)" stroke-width="4"/>
      <text x="25" y="45" fill="url(#goldGrad)" font-family="Arial Black, sans-serif" font-size="24" font-weight="900">Гослицензия 🏆</text>
      <text x="25" y="75" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="17" font-weight="700">Вычет 13% + Заморозка</text>
      <text x="25" y="100" fill="#B5C4BB" font-family="Arial, sans-serif" font-size="13">Официальный статус и гарантии</text>
    </g>
  </g>

  <!-- ================= 3. FOOTER (CTA + BRANCHES + CONTACTS + VK) ================= -->
  <g transform="translate(60, 1310)">
    <!-- CTA Button -->
    <g filter="url(#boxShadow)">
      <rect width="1120" height="76" rx="20" fill="url(#emeraldGrad)" stroke="#FFC72C" stroke-width="2"/>
      <text x="560" y="48" text-anchor="middle" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" letter-spacing="1">
        ЗАПИСАТЬСЯ НА БЕСПЛАТНУЮ ТРЕНИРОВКУ →
      </text>
    </g>

    <!-- Info Grid Box -->
    <g transform="translate(0, 95)" filter="url(#boxShadow)">
      <rect width="1120" height="175" rx="20" fill="#0D130F" fill-opacity="0.95" stroke="#FFC72C" stroke-width="1"/>

      <!-- 1. Branches -->
      <g transform="translate(30, 25)">
        <text x="0" y="18" fill="#FFC72C" font-family="Arial Black, sans-serif" font-size="14" font-weight="900" letter-spacing="1">📍 ФИЛИАЛЫ В НОВОСИБИРСКЕ:</text>
        <circle cx="5" cy="45" r="3" fill="#FFC72C"/>
        <text x="18" y="50" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="15" font-weight="700">ул. Большевистская, 125</text>
        
        <circle cx="5" cy="75" r="3" fill="#FFC72C"/>
        <text x="18" y="80" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="15" font-weight="700">ул. Планетная, 53</text>
        
        <circle cx="5" cy="105" r="3" fill="#FFC72C"/>
        <text x="18" y="110" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="15" font-weight="700">ул. Мясниковой, 25/2</text>
      </g>

      <!-- Divider -->
      <line x1="430" y1="20" x2="430" y2="155" stroke="#FFC72C" stroke-width="1" stroke-opacity="0.3"/>

      <!-- 2. Contacts -->
      <g transform="translate(460, 25)">
        <text x="0" y="18" fill="#FFC72C" font-family="Arial Black, sans-serif" font-size="14" font-weight="900" letter-spacing="1">📞 КОНТАКТЫ И СВЯЗЬ:</text>
        
        <text x="0" y="48" fill="#9DB0A4" font-family="Arial, sans-serif" font-size="12" font-weight="600">Администратор:</text>
        <text x="0" y="70" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="17" font-weight="900">+7 (351) 230-12-69</text>
        
        <text x="0" y="98" fill="#9DB0A4" font-family="Arial, sans-serif" font-size="12" font-weight="600">Директор:</text>
        <text x="0" y="120" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-size="17" font-weight="900">+7 (919) 339-33-99</text>
      </g>

      <!-- Divider -->
      <line x1="770" y1="20" x2="770" y2="155" stroke="#FFC72C" stroke-width="1" stroke-opacity="0.3"/>

      <!-- 3. VK & QR -->
      <g transform="translate(800, 25)">
        <!-- QR Box -->
        <rect x="0" y="10" width="105" height="105" rx="10" fill="#FFFFFF" stroke="#FFC72C" stroke-width="1.5"/>
        <rect x="12" y="22" width="30" height="30" fill="#0B0F0D"/>
        <rect x="62" y="22" width="30" height="30" fill="#0B0F0D"/>
        <rect x="12" y="72" width="30" height="30" fill="#0B0F0D"/>
        <rect x="48" y="58" width="12" height="12" fill="#FFC72C"/>

        <g transform="translate(125, 20)">
          <text x="0" y="18" fill="#FFC72C" font-family="Arial Black, sans-serif" font-size="14" font-weight="900" letter-spacing="1">ВКОНТАКТЕ:</text>
          <text x="0" y="48" fill="#00D06C" font-family="Arial Black, sans-serif" font-size="16" font-weight="900">vk.ru/sparta_fk</text>
          <text x="0" y="78" fill="#E6EDE8" font-family="Arial, sans-serif" font-size="12">Сканируйте QR</text>
          <text x="0" y="96" fill="#E6EDE8" font-family="Arial, sans-serif" font-size="12">для быстрой записи</text>
        </g>
      </g>
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/banner-assets/sparta-complete-banner.svg'), svgContent, 'utf-8');
console.log('✅ Generated standalone self-contained sparta-complete-banner.svg with embedded base64 images!');
