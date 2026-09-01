import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load 3D base64 icons
const iconsBase64Path = path.resolve(__dirname, 'icons_base64.json');
const ICONS_3D = JSON.parse(fs.readFileSync(iconsBase64Path, 'utf8'));

function iconTag(key, size = 50) {
  return `<image width="${size}" height="${size}" href="${ICONS_3D[key]}" preserveAspectRatio="xMidYMid meet"/>`;
}

// 8 Direction Cards Data
const CARDS = [
  // Row 1
  {
    col: 0, row: 0,
    id: "Card_Dance",
    barColor: "#3B6955",
    dotColor: "#3B6955",
    icon: "dance",
    title: "Школа танцев",
    hall: "Музыкальный зал 🏡",
    benefit: "Красивая осанка, гибкость, пластика и чувство ритма.",
    badgeText: "🩰 Ритмика и базовая хореография",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "17:30" }
    ]
  },
  {
    col: 1, row: 0,
    id: "Card_Qigong",
    barColor: "#3B6955",
    dotColor: "#3B6955",
    icon: "qigong",
    title: "Оздоровительный цигун",
    hall: "Музыкальный зал 🏡",
    benefit: "Здоровый рост, позвоночник, гибкость и спокойствие.",
    badgeText: "🌿 Мягкая гимнастика и дыхание",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "16:30" }
    ]
  },

  // Row 2
  {
    col: 0, row: 1,
    id: "Card_Champion",
    barColor: "#E06D44",
    dotColor: "#E06D44",
    icon: "champion",
    title: "Проект «Чемпион»",
    hall: "Спортивный зал 🏡",
    benefit: "Спортивная база, качественное ОФП, растяжка и характер.",
    badgeText: "⚡ 3 раза в неделю для супер-формы",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср, Пт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср, Пт", time: "16:30" }
    ]
  },
  {
    col: 1, row: 1,
    id: "Card_Martial",
    barColor: "#E06D44",
    dotColor: "#E06D44",
    icon: "martial",
    title: "Боевые искусства",
    hall: "Спортивный зал 🏡",
    benefit: "ОФП, дисциплина, уверенность в себе и самооборона.",
    badgeText: "🛡 Самооборона и координация",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср, Пт", time: "17:30" }
    ]
  },

  // Row 3
  {
    col: 0, row: 2,
    id: "Card_Lego",
    barColor: "#D97706",
    dotColor: "#D97706",
    icon: "lego",
    title: "Легоконструирование",
    hall: "Зал ИЗО 🏡",
    benefit: "Сборка моделей, логика, моторика и основы IT.",
    badgeText: "🤖 Моделирование и основы IT",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср", time: "17:30" }
    ]
  },
  {
    col: 1, row: 2,
    id: "Card_English",
    barColor: "#5850EC",
    dotColor: "#5850EC",
    icon: "english",
    title: "Английский язык",
    hall: "Зал ИЗО 🏡",
    benefit: "Игровой формат, расширение словаря и произношение.",
    badgeText: "🗣 Разговорная практика в играх",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "16:30" }
    ]
  },

  // Row 4
  {
    col: 0, row: 3,
    id: "Card_School",
    barColor: "#5850EC",
    dotColor: "#5850EC",
    icon: "school",
    title: "Подготовка к школе",
    hall: "Зал ИЗО 🏡",
    benefit: "Лёгкий старт перед 1 классом: чтение, письмо, счёт.",
    badgeText: "📖 Интеллектуальное развитие",
    badgeTime: "⏱ 45 мин",
    slots: [
      { group: "Старшая группа (6–7 лет)", days: "Вт, Чт", time: "17:00–17:45" },
      { group: "⏱ Комплекс занятий", days: "Чтение • Письмо", time: "45 мин", isCustom: true }
    ]
  },
  {
    col: 1, row: 3,
    id: "Card_Logoped",
    barColor: "#D97706",
    dotColor: "#D97706",
    icon: "logoped",
    title: "Логопед",
    hall: "Зал ИЗО 🏡",
    benefit: "Речь, звукопроизношение, постановка звуков.",
    badgeText: "💬 Постановка звуков и словарь",
    badgeTime: "⏱ 30 мин",
    slots: [
      { group: "Младшая (2–4 года)", days: "Пн, Ср", time: "16:00" },
      { group: "Старшая (5–7 лет)", days: "Пн, Ср", time: "16:30" },
      { group: "Индивидуально", days: "Пятница", time: "по записи", isCustom: true }
    ]
  }
];

function renderCard(c) {
  const cardW = 486;
  const cardH = 308;
  const colX = c.col === 0 ? 44 : 550;
  const rowY = 230 + c.row * (cardH + 24);

  const isLogoped = c.id === "Card_Logoped";

  // Slots start exactly 16px after header divider (y = 100 + 16 = 116)
  const slotsSvg = c.slots.map((s, idx) => {
    const slotH = isLogoped ? 40 : 46;
    const slotY = 116 + idx * (slotH + (isLogoped ? 5 : 8));
    const isSpecial = s.isCustom;
    return `
      <g transform="translate(18, ${slotY})">
        <rect width="450" height="${slotH}" rx="11" fill="${isSpecial ? '#F7EFE6' : '#FAF7F2'}"/>
        <circle cx="16" cy="${slotH / 2}" r="3.75" fill="${c.dotColor}"/>
        <text x="28" y="${slotH / 2 + 5}" fill="#2B2118" class="font-main" font-size="${isLogoped ? 12.5 : 13.5}" font-weight="${isSpecial ? '700' : '600'}">${s.group}</text>
        <rect x="338" y="${slotH / 2 - 14}" width="98" height="28" rx="7" fill="${isSpecial ? '#FFFFFF' : '#F7EFE6'}"/>
        <text x="387" y="${slotH / 2 + 5}" text-anchor="middle" fill="#2B2118" class="font-main" font-size="13" font-weight="700">${s.time}</text>
        <text x="328" y="${slotH / 2 + 5}" text-anchor="end" fill="#374151" class="font-main" font-size="13" font-weight="700">${s.days}</text>
      </g>
    `;
  }).join('');

  // Footer tag is positioned 14px after the slots list
  const footerTagY = cardH - 38;

  return `
  <!-- ${c.id}: ${c.title} -->
  <g id="${c.id}" transform="translate(${colX}, ${rowY})">
    <!-- Base Card -->
    <rect width="${cardW}" height="${cardH}" rx="22" fill="#FFFFFF" stroke="#EFE8DE" stroke-width="1"/>
    
    <!-- Top Accent Bar -->
    <rect x="18" y="0" width="${cardW - 36}" height="4" rx="2" fill="${c.barColor}"/>

    <!-- 1. Header (Icon + Title + Hall + Benefit) -->
    <g transform="translate(18, 16)">
      <g transform="translate(0, 0)">${iconTag(c.icon, 48)}</g>
      <text x="60" y="20" fill="#2B2118" class="font-main" font-size="16.5" font-weight="800">${c.title}</text>
      <g transform="translate(225, 4)">
        <rect width="170" height="22" rx="6" fill="#F7EFE6"/>
        <text x="85" y="15" text-anchor="middle" fill="#4B5563" class="font-main" font-size="12" font-weight="600">${c.hall}</text>
      </g>
      <!-- Subtitle: High contrast #374151, font-size 13.5px -->
      <text x="60" y="42" fill="#374151" class="font-main" font-size="13.5" font-weight="500">${c.benefit}</text>
    </g>

    <!-- Divider Line -->
    <line x1="18" y1="100" x2="${cardW - 18}" y2="100" stroke="#F3EDE4" stroke-width="1"/>

    <!-- 2. Schedule Slots (Gap 16px after header) -->
    ${slotsSvg}

    <!-- 3. Bottom Benefit Pill (Gap 14px after schedule slots, #4B5563) -->
    <g transform="translate(18, ${footerTagY})">
      <rect width="450" height="26" rx="8" fill="#FAF7F2"/>
      <text x="14" y="17" fill="#4B5563" class="font-main" font-size="12" font-weight="600">${c.badgeText}</text>
      <text x="436" y="17" text-anchor="end" fill="#4B5563" class="font-main" font-size="12" font-weight="600">${c.badgeTime}</text>
    </g>
  </g>
  `;
}

const posterSvg = `<svg id="schedule-poster 1" width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Styles & Fonts -->
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;family=Inter:wght@400;500;600;700;800;900&amp;display=swap');
      .font-main { font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
    <filter id="glow-sun-blur" x="500" y="-200" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="80"/>
    </filter>
    <filter id="glow-peach-blur" x="-200" y="1300" width="800" height="800" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="90"/>
    </filter>
  </defs>

  <!-- Background Base (#FAF7F2 Warm Oatmeal / Cream Alabaster) -->
  <rect width="1080" height="1920" fill="#FAF7F2"/>

  <!-- Decorative Glows / Orbs -->
  <g filter="url(#glow-sun-blur)">
    <circle cx="880" cy="100" r="180" fill="#FCD34D" fill-opacity="0.25"/>
  </g>
  <g filter="url(#glow-peach-blur)">
    <circle cx="120" cy="1680" r="170" fill="#F87171" fill-opacity="0.15"/>
  </g>

  <!-- ========================================== -->
  <!-- БЛОК A: ШАПКА (Header: y=56..196, h=140)    -->
  <!-- ========================================== -->
  <g id="Header" transform="translate(44, 56)">
    <!-- Top Badge Pill -->
    <g id="Brand_Badge" transform="translate(336, 0)">
      <rect width="320" height="38" rx="19" fill="#FDEED9" stroke="#F7D5B0" stroke-width="1"/>
      <text x="160" y="24" text-anchor="middle" fill="#B84A28" class="font-main" font-size="14.5" font-weight="700" letter-spacing="0.5">✨ ЦСП СПАРТА • ДЕТСКИЙ СПОРТ</text>
    </g>

    <!-- Main Title -->
    <text x="496" y="86" text-anchor="middle" fill="#2B2118" class="font-main" font-size="42" font-weight="800" letter-spacing="-0.5">РАСПИСАНИЕ СЕКЦИЙ</text>

    <!-- Location Subtitles (ул. Ласковая, 26) -->
    <g id="Location_Info">
      <text x="496" y="122" text-anchor="middle" fill="#E06D44" class="font-main" font-size="20" font-weight="700">Детский сад «Солнышко» • ЖК «Парковый Premium»</text>
      <text x="496" y="146" text-anchor="middle" fill="#736357" class="font-main" font-size="15" font-weight="500">ул. Ласковая, 26 • Сезон 2026/2027</text>
    </g>
  </g>

  <!-- ========================================== -->
  <!-- БЛОК B: 8 НЕЗАВИСИМЫХ КАРТОЧЕК НАПРАВЛЕНИЙ  -->
  <!-- 4 ряда × 2 колонки, compact Auto Layout    -->
  <!-- ========================================== -->
  <g id="Sections_Grid">
    ${CARDS.map(renderCard).join('\n')}
  </g>

  <!-- ========================================== -->
  <!-- БЛОК C: ПОДВАЛ / КОНТАКТЫ (Footer)         -->
  <!-- ========================================== -->
  <g id="Footer_Contacts" transform="translate(44, 1728)">
    <rect width="992" height="138" rx="22" fill="#2B2118"/>

    <!-- Left Contacts -->
    <g transform="translate(36, 26)">
      <text x="0" y="14" fill="#C4B5A5" class="font-main" font-size="13" font-weight="600" letter-spacing="0.8">ЗАПИСЬ И КОНСУЛЬТАЦИИ:</text>
      <text x="0" y="50" fill="#FAF7F2" class="font-main" font-size="28" font-weight="800">📞 +7 (919) 339-33-99</text>
      <text x="0" y="78" fill="#E5DDD4" class="font-main" font-size="15.5" font-weight="500">Руководитель: Ксения Лебедева</text>
    </g>

    <!-- Right Note Box with Crisp Vector Sneaker -->
    <g transform="translate(540, 36)">
      <rect width="416" height="66" rx="14" fill="#FFFFFF" fill-opacity="0.08"/>
      <g transform="translate(20, 20)">
        <path d="M2.5 16C2.5 17.1 3.4 18 4.5 18H19.5C20.6 18 21.5 17.1 21.5 16V14.8C21.5 13.9 20.8 13.1 19.9 12.8L14.5 11L12.5 7.2C12.1 6.4 11.3 5.9 10.4 5.9H6C4.9 5.9 4 6.8 4 7.9V13.5L2.5 16Z" stroke="#FAF7F2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.5 14H20.5" stroke="#FAF7F2" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M8 9.5H11" stroke="#FAF7F2" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M7.5 11.5H11.5" stroke="#FAF7F2" stroke-width="1.4" stroke-linecap="round"/>
      </g>
      <text x="56" y="39" fill="#E5DDD4" class="font-main" font-size="14.5" font-weight="500">Форма: удобная одежда + сменная чистая обувь</text>
    </g>
  </g>

</svg>`;

fs.writeFileSync(path.resolve(__dirname, '../public/schedule-poster.svg'), posterSvg, 'utf8');
console.log('✅ Updated SVG poster with calibrated Auto Layout, high-contrast typography, and Ласковая 26: public/schedule-poster.svg');
