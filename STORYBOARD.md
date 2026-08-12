# STORYBOARD: Sparta Sports Center Showcase (40s)

## Overview
- **Project**: Sparta Sports Center - Main Screen & Ecosystem Demo
- **Format**: 16:9 (1920x1080) @ 30fps
- **Duration**: 40.0s (1200 frames)
- **Audio/Vibe**: Energetic Modern Synthwave / Cyberpunk Sport Beat

---

## Scene 1: Hero & Premium Branding (0.0s - 10.0s)
- **Visuals**:
  - Dark glassmorphism card floating into view with dynamic radial glow (`rgba(245, 158, 11, 0.15)`).
  - Glowing Sparta Emblem / Shield icon with animated gold outline.
  - Heading: "SPARTA SPORTS CENTER" in bold gradient text (Amber to Gold).
  - Subtitle: "Многофункциональный спортивный комплекс & Цифровая экосистема".
  - Feature Pills sliding in: `[⚡ Онлайн-запись]`, `[🏆 Турниры & Награды]`, `[💬 Умный Мессенджер]`.
- **Motion**:
  - Smooth scale-up (0.8 -> 1.0) with custom spring cubic-bezier.
  - Floating ambient particles and neon grid background.
- **Copy (RU)**:
  - "Добро пожаловать в Sparta Sports Center — инновационный комплекс подготовки атлетов."

---

## Scene 2: Sports Directions & Coaches (10.0s - 20.0s)
- **Visuals**:
  - 3D Grid layout of sports directions:
    - 🥊 **Единоборства** (Бокс, Самбо, Дзюдо) — Crimson Badge
    - 🤸 **Спортивная Гимнастика** — Cyan Badge
    - 🏊 **Плавание & Аква-фитнес** — Blue Badge
    - 🏋️ **ОФП & Кроссфит** — Amber Badge
  - Interactive Coach Cards sliding horizontally with avatar glow, titles, and rating badges ⭐ 4.9.
- **Motion**:
  - Staggered entry animation (0.1s offset per card).
  - Hover highlight effect with subtle elevation and border shine.
- **Copy (RU)**:
  - "Профессиональные тренеры, современное оборудование и персональные программы."

---

## Scene 3: Community & Messenger Ecosystem (20.0s - 30.0s)
- **Visuals**:
  - Mockup of the Sparta Real-Time Chat Room (`components/profile/GroupChat.tsx`).
  - Chat conversation animation:
    - Coach message: *"Завтра в 18:00 открытая тренировка по Самбо!"*
    - User reaction: 🔥 x12, 🥊 x8.
    - Animated voice message bar with audio waveform simulation (`webm` note preview).
    - Custom Sparta Emoji picker popup (`SpartaEmojiPicker.tsx`) showcasing Apple-style high-res emojis.
    - Card inside chat: `[Записаться на занятие -> 18:00]`.
- **Motion**:
  - Message bubble typing animation and popping into view.
  - Waveform visualizer bars pulsing.
- **Copy (RU)**:
  - "Общайтесь с тренерами и командой в реальном времени. Голосовые сообщения, записи и Sparta Emoji."

---

## Scene 4: Call-to-Action & Closing (30.0s - 40.0s)
- **Visuals**:
  - Centered CTA Card with glowing glass border.
  - Highlighting "Первое пробное занятие — БЕСПЛАТНО".
  - Large interactive CTA Button: **"Записаться прямо сейчас ➔"** with pulsing light glow.
  - Contact badges: 📍 ул. Спартаковская, 15 | 📞 +7 (800) 555-35-35 | 🌐 sparta-sports.ru.
- **Motion**:
  - Pulsing CTA button.
  - Smooth particle exit fade.
- **Copy (RU)**:
  - "Присоединяйтесь к команде победителей. Запишитесь на первое занятие прямо сейчас!"
