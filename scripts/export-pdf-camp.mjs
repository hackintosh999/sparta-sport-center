import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

async function exportPerfectPdf() {
  const outputPdfPath = path.resolve(__dirname, '../public/banner-assets/sparta-summer-camp-banner.pdf');
  const printReadyPdfPath = path.resolve(__dirname, '../public/sparta-a4-print-ready.pdf');
  const standaloneHtmlPath = path.resolve(__dirname, '../public/banner-print-standalone.html');

  // Load all images as Base64 to guarantee 100% loading in file:// protocol
  const stadiumB64 = getBase64('public/banner-assets/field-stadium-bg.jpg');
  const logoB64 = getBase64('public/logo-gold.png');
  const boyB64 = getBase64('public/banner-assets/sparta-boy-soccer.jpg');
  const trainingB64 = getBase64('public/sparta_real_dynamics.jpg');
  const iconZeroB64 = getBase64('public/banner-assets/icon-3d-zero.jpg');
  const iconGiftB64 = getBase64('public/banner-assets/icon-3d-gift.jpg');
  const iconFreezeB64 = getBase64('public/banner-assets/icon-3d-freeze.jpg');
  const iconLicenseB64 = getBase64('public/banner-assets/icon-3d-license.jpg');
  const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ЦСП Спарта — Идеальный постер А4 (Pre-Print Master Edition)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Unbounded:wght@700;800;900&family=Onest:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --neon-lime: #E2F806;
      --neon-yellow: #FFE600;
      --sparta-gold: #FFC72C;
      --sparta-green: #00A859;
      --deep-stadium: #050D15;
      --dark-card: rgba(8, 16, 24, 0.95);
      --text-white: #FFFFFF;
      --text-milk: #F8F9FA;
      --text-sub-print: #F0F4F2;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: 1240px 1754px;
      margin: 0;
    }

    html, body {
      width: 1240px;
      height: 1754px;
      margin: 0;
      padding: 0;
      background: var(--deep-stadium);
      color: var(--text-white);
      font-family: 'Onest', 'Montserrat', sans-serif;
      overflow: hidden;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .poster-a4 {
      width: 1240px;
      height: 1754px;
      position: relative;
      background: var(--deep-stadium);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .bg-stadium-photo {
      position: absolute;
      top: 0;
      left: 0;
      width: 1240px;
      height: 1754px;
      object-fit: cover;
      object-position: center bottom;
      z-index: 1;
      filter: contrast(1.12) brightness(0.95);
    }

    .halftone-dots-pattern {
      position: absolute;
      top: 400px;
      right: 0;
      width: 500px;
      height: 800px;
      background-image: radial-gradient(rgba(226, 248, 6, 0.18) 1.5px, transparent 1.5px);
      background-size: 14px 14px;
      z-index: 3;
      pointer-events: none;
      mask-image: linear-gradient(135deg, transparent 20%, black 70%, transparent 95%);
      -webkit-mask-image: linear-gradient(135deg, transparent 20%, black 70%, transparent 95%);
    }

    .top-sky-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 1240px;
      height: 650px;
      background: linear-gradient(180deg, 
        rgba(3, 8, 16, 0.98) 0%, 
        rgba(5, 13, 21, 0.9) 65%, 
        transparent 100%
      );
      z-index: 2;
    }

    /* ================= 1. ВЕРХНИЙ ЗАГОЛОВОК И ЗОЛОТОЙ ГЕРБ ================= */
    .top-headline-area {
      position: relative;
      z-index: 10;
      padding: 36px 60px 5px 60px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .title-left-col {
      display: flex;
      flex-direction: column;
      max-width: 830px;
    }

    .brand-top-tag {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .brand-tag-pill {
      background: rgba(8, 16, 24, 0.9);
      border: 1.5px solid var(--neon-lime);
      color: var(--neon-lime);
      padding: 5px 18px;
      border-radius: 30px;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .h1-line-1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 52px;
      font-weight: 900;
      font-style: italic;
      color: #FFFFFF;
      line-height: 0.95;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .h1-line-2 {
      font-family: 'Montserrat', 'Unbounded', sans-serif;
      font-size: 86px;
      font-weight: 900;
      font-style: italic;
      color: var(--neon-lime);
      line-height: 0.95;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      text-shadow: 0 0 30px rgba(226, 248, 6, 0.5);
      margin: 3px 0;
      white-space: nowrap;
    }
    .h1-line-3 {
      font-family: 'Montserrat', sans-serif;
      font-size: 56px;
      font-weight: 900;
      font-style: italic;
      color: #FFFFFF;
      line-height: 0.95;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .slogan-yellow-box {
      display: inline-block;
      background: var(--neon-lime);
      color: #050D15;
      padding: 7px 18px;
      font-family: 'Montserrat', sans-serif;
      font-size: 15.5px;
      font-weight: 900;
      font-style: italic;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transform: skewX(-12deg);
      margin-top: 12px;
      width: fit-content;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
    }

    .soul-text-paragraph {
      font-size: 21px;
      font-weight: 700;
      line-height: 1.4;
      color: var(--text-milk);
      margin-top: 14px;
      max-width: 720px;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.95);
      background: rgba(8, 16, 24, 0.75);
      padding: 10px 18px;
      border-radius: 12px;
      border-left: 5px solid var(--neon-lime);
    }

    .top-right-crest-box {
      position: absolute;
      top: 35px;
      right: 55px;
      width: 175px;
      height: 175px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .crest-gold-aura {
      position: absolute;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(255, 199, 44, 0.45) 0%, rgba(226, 248, 6, 0.2) 45%, transparent 70%);
      filter: blur(20px);
      z-index: -1;
    }
    .crest-gold-img {
      width: 160px;
      height: 160px;
      object-fit: contain;
      filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 25px rgba(255, 199, 44, 0.75));
    }

    /* ================= 2. НАКЛОННАЯ ЛЕНТА ВОЗРАСТА ================= */
    .age-slant-ribbon {
      position: relative;
      z-index: 12;
      margin: 20px 60px 18px 60px;
      background: var(--neon-lime);
      color: #050D15;
      padding: 12px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'Montserrat', 'Unbounded', sans-serif;
      font-size: 25px;
      font-weight: 900;
      font-style: italic;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      transform: skewX(-10deg);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.8);
      width: fit-content;
    }
    .age-slant-ribbon svg {
      width: 28px;
      height: 28px;
      fill: #050D15;
    }

    /* ================= 3. ОСНОВНОЙ КОНТЕНТ (2 КОЛОНКИ) ================= */
    .main-body-columns {
      position: relative;
      z-index: 10;
      padding: 0 60px;
      display: grid;
      grid-template-columns: 590px 530px;
      gap: 30px;
      align-items: stretch;
    }

    .left-benefits-col {
      display: flex;
      flex-direction: column;
      gap: 11px;
      width: 590px;
    }

    .benefit-brush-card {
      background: var(--dark-card);
      border-left: 6px solid var(--neon-lime);
      border-radius: 8px 16px 16px 8px;
      padding: 11px 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* ИДЕАЛЬНЫЙ КВАДРАТ 1:1 ДЛЯ 3D ИКОНОК БЕЗ ИСКАЖЕНИЙ */
    .benefit-3d-icon-box {
      width: 68px;
      height: 68px;
      min-width: 68px;
      min-height: 68px;
      border-radius: 16px;
      background: #04090F;
      border: 2px solid var(--neon-lime);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 18px rgba(226, 248, 6, 0.35);
      overflow: hidden;
    }
    .benefit-3d-icon-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      display: block;
      aspect-ratio: 1 / 1;
    }

    .benefit-text-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .benefit-main-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 20.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #FFFFFF;
      letter-spacing: 0.02em;
    }
    .benefit-sub-desc {
      font-size: 15.5px;
      color: var(--text-sub-print);
      font-weight: 600;
      line-height: 1.3;
    }

    .venue-slant-card {
      margin-top: 4px;
      background: var(--neon-lime);
      color: #050D15;
      padding: 14px 22px;
      border-radius: 14px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.9);
      position: relative;
      overflow: hidden;
    }
    .venue-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .venue-header-row svg {
      width: 22px;
      height: 22px;
      fill: #050D15;
    }
    .venue-address-item {
      font-family: 'Montserrat', sans-serif;
      font-size: 16.5px;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.35;
      letter-spacing: 0.02em;
    }

    .cta-solid-btn {
      margin-top: 10px;
      width: 100%;
      height: 72px;
      background: linear-gradient(135deg, #FFE600 0%, #E2F806 50%, #D4F000 100%);
      color: #050D15;
      border: 3px solid #FFFFFF;
      border-radius: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      font-family: 'Montserrat', 'Unbounded', sans-serif;
      font-size: 19px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 12px 40px rgba(226, 248, 6, 0.65);
    }

    /* =========================================================================
       ПРАВАЯ КОЛОНКА: ИДЕАЛЬНЫЕ ПРОПОРЦИОНАЛЬНЫЕ ФОТОКАРТОЧКИ БЕЗ ИСКАЖЕНИЙ
       ========================================================================= */
    .right-photos-col {
      position: relative;
      height: 820px;
      width: 530px;
    }

    /* 1. ГЛАВНОЕ ФОТО МАЛЬЧИКА (ПОРТРЕТ 3:4 БЕЗ РАСТЯЖЕНИЯ) */
    .clean-hero-card {
      position: absolute;
      top: 0;
      right: 0;
      width: 490px;
      height: 540px;
      transform: rotate(-3deg);
      border-radius: 20px;
      overflow: hidden;
      border: 5px solid var(--neon-lime);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(226, 248, 6, 0.4);
      z-index: 8;
      background: #04090F;
    }
    .clean-hero-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      display: block;
    }

    .hero-badge-clean {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(5, 13, 21, 0.95);
      border: 2px solid var(--neon-lime);
      color: var(--neon-lime);
      padding: 8px 22px;
      border-radius: 30px;
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      z-index: 10;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
    }

    /* 2. ВТОРОЕ ФОТО ТРЕНИРОВКИ (16:9 ШИРОКИЙ ФОРМАТ БЕЗ РАСТЯЖЕНИЯ) */
    .clean-team-card {
      position: absolute;
      bottom: -10px;
      left: -20px;
      width: 480px;
      height: 280px;
      transform: rotate(3.5deg);
      border-radius: 18px;
      overflow: hidden;
      border: 5px solid var(--neon-yellow);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 230, 0, 0.35);
      z-index: 9;
      background: #04090F;
    }
    .clean-team-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 30%;
      display: block;
    }

    /* ================= 5. НИЖНЯЯ ПАНЕЛЬ КОНТАКТОВ С РЕАЛЬНЫМ QR ================= */
    .bottom-contacts-bar {
      position: relative;
      z-index: 15;
      margin-top: auto;
      margin-bottom: 30px;
      margin-left: 60px;
      margin-right: 60px;
      background: rgba(4, 9, 15, 0.96);
      border: 2px solid rgba(226, 248, 6, 0.35);
      border-radius: 20px;
      padding: 16px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(15px);
    }

    .phone-contact-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .phone-title {
      font-size: 12.5px;
      color: var(--neon-lime);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .phone-number {
      font-family: 'Montserrat', sans-serif;
      font-size: 19px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.02em;
    }

    .contacts-divider {
      width: 2px;
      height: 48px;
      background: rgba(255, 255, 255, 0.15);
    }

    .vk-qr-wrapper {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .qr-quiet-zone-card {
      width: 78px;
      height: 78px;
      background: #FFFFFF;
      border-radius: 12px;
      padding: 5px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-quiet-zone-card img {
      width: 68px;
      height: 68px;
      display: block;
    }
    .vk-text-details {
      display: flex;
      flex-direction: column;
    }
    .vk-main-link {
      font-family: 'Montserrat', sans-serif;
      font-size: 19px;
      font-weight: 900;
      color: var(--neon-lime);
      text-decoration: none;
    }
    .vk-sub-text {
      font-size: 13.5px;
      font-weight: 700;
      color: #FFFFFF;
      margin-top: 2px;
    }
    .vk-sub-hint {
      font-size: 11.5px;
      color: #B2C4D0;
    }
  </style>
</head>
<body>

  <div class="poster-a4" id="poster-a4-camp">
    <!-- 100% EMBEDDED BASE64 IMAGES -->
    <img src="${stadiumB64}" alt="Футбольный стадион" class="bg-stadium-photo">
    <div class="top-sky-overlay"></div>
    <div class="halftone-dots-pattern"></div>

    <!-- 1. TOP HEADLINE & GOLD CREST -->
    <div class="top-headline-area">
      <div class="title-left-col">
        <div class="brand-top-tag">
          <div class="brand-tag-pill">ЦСП «СПАРТА» • НОВОСИБИРСК</div>
        </div>

        <div class="h1-line-1">ФУТБОЛ ДЛЯ ДЕТЕЙ</div>
        <div class="h1-line-2">ЦСП «СПАРТА»</div>
        <div class="h1-line-3">ОТКРЫВАЕТ НАБОР</div>

        <div class="slogan-yellow-box">ИГРАЙ. УЧИСЬ. ПОБЕЖДАЙ.</div>

        <p class="soul-text-paragraph">
          Учим любить футбол, играть в команде и верить в свои силы.<br>
          Создаём атмосферу, куда ребёнок бежит с удовольствием на каждую тренировку.
        </p>
      </div>

      <div class="top-right-crest-box">
        <div class="crest-gold-aura"></div>
        <img src="${logoB64}" alt="Золотой герб ЦСП Спарта" class="crest-gold-img">
      </div>
    </div>

    <!-- 2. НАКЛОННАЯ ЛЕНТА ВОЗРАСТА -->
    <div class="age-slant-ribbon">
      <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
      <span>ДЛЯ ДЕТЕЙ ОТ 4 ДО 14 ЛЕТ</span>
    </div>

    <!-- 3. ОСНОВНЫЕ БЛОКИ (2 КОЛОНКИ) -->
    <div class="main-body-columns">
      <!-- Левая колонка: 4 КАРТОЧКИ ЗАБОТЫ -->
      <div class="left-benefits-col">
        <!-- Карточка 1: 0 рублей -->
        <div class="benefit-brush-card">
          <div class="benefit-3d-icon-box">
            <img src="${iconZeroB64}" alt="3D Иконка 0 рублей">
          </div>
          <div class="benefit-text-box">
            <div class="benefit-main-title">0 ₽ — ПРОБНОЕ ЗАНЯТИЕ</div>
            <div class="benefit-sub-desc">Первая тренировка и знакомство с тренером бесплатно</div>
          </div>
        </div>

        <!-- Карточка 2: Мяч в подарок -->
        <div class="benefit-brush-card">
          <div class="benefit-3d-icon-box">
            <img src="${iconGiftB64}" alt="3D Иконка мяч в подарок">
          </div>
          <div class="benefit-text-box">
            <div class="benefit-main-title">МЯЧ В ПОДАРОК ⚽</div>
            <div class="benefit-sub-desc">Фирменный мяч SPARTA к первому абонементу</div>
          </div>
        </div>

        <!-- Карточка 3: Заморозка абонемента при болезни -->
        <div class="benefit-brush-card">
          <div class="benefit-3d-icon-box">
            <img src="${iconFreezeB64}" alt="3D Иконка заморозки абонемента">
          </div>
          <div class="benefit-text-box">
            <div class="benefit-main-title">ЗАМОРОЗКА ПРИ БОЛЕЗНИ ❄️</div>
            <div class="benefit-sub-desc">Бесплатная заморозка занятий — абонемент не сгорает</div>
          </div>
        </div>

        <!-- Карточка 4: Гослицензия -->
        <div class="benefit-brush-card">
          <div class="benefit-3d-icon-box">
            <img src="${iconLicenseB64}" alt="3D Иконка гослицензия">
          </div>
          <div class="benefit-text-box">
            <div class="benefit-main-title">ГОСЛИЦЕНЗИЯ (ВЫЧЕТ 13%)</div>
            <div class="benefit-sub-desc">Официальный возврат налогов + материнский капитал</div>
          </div>
        </div>

        <!-- БЛОК АДРЕСОВ ФИЛИАЛОВ -->
        <div class="venue-slant-card">
          <div class="venue-header-row">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>ФИЛИАЛЫ В НОВОСИБИРСКЕ:</span>
          </div>
          <div class="venue-address-item">• ул. Большевистская, 125  • ул. Планетная, 53</div>
          <div class="venue-address-item">• ул. Мясниковой, 25/2</div>
        </div>

        <!-- КНОПКА CTA -->
        <button class="cta-solid-btn">
          <span>ЗАПИСАТЬСЯ НА БЕСПЛАТНЫЙ УРОК →</span>
        </button>
      </div>

      <!-- Правая колонка: ИДЕАЛЬНЫЕ ЧИСТЫЕ РАМКИ БЕЗ ИСКАЖЕНИЙ -->
      <div class="right-photos-col">
        <!-- 1. Главное фото мальчика -->
        <div class="clean-hero-card">
          <img src="${boyB64}" alt="Юный футболист Спарта">
          <div class="hero-badge-clean">ЦСП СПАРТА • 2026</div>
        </div>

        <!-- 2. Второе фото тренировки -->
        <div class="clean-team-card">
          <img src="${trainingB64}" alt="Тренировка команды">
        </div>
      </div>
    </div>

    <!-- 4. КОНТАКТЫ И QR-КОД -->
    <div class="bottom-contacts-bar">
      <!-- Директор -->
      <div class="phone-contact-group">
        <span class="phone-title">ДИРЕКТОР ЦСП «СПАРТА»:</span>
        <span class="phone-number">+7 (919) 339-33-99</span>
      </div>

      <div class="contacts-divider"></div>

      <!-- Администратор -->
      <div class="phone-contact-group">
        <span class="phone-title">АДМИНИСТРАТОР:</span>
        <span class="phone-number">+7 (351) 230-12-69</span>
      </div>

      <div class="contacts-divider"></div>

      <!-- QR-код -->
      <div class="vk-qr-wrapper">
        <div class="qr-quiet-zone-card">
          <img src="${realQrB64}" alt="ВКонтакте QR">
        </div>
        <div class="vk-text-details">
          <a href="https://vk.ru/sparta_fk" target="_blank" class="vk-main-link">vk.ru/sparta_fk</a>
          <span class="vk-sub-text">Официальное сообщество</span>
          <span class="vk-sub-hint">Наведите камеру смартфона</span>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;

  fs.writeFileSync(standaloneHtmlPath, htmlContent, 'utf-8');

  console.log('🚀 Launching Puppeteer for Master Pre-Print Sparta A4 PDF with perfect proportions...');

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

  await page.goto(`file://${standaloneHtmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 600));

  // Export PDF
  await page.pdf({
    path: outputPdfPath,
    width: '1240px',
    height: '1754px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  fs.copyFileSync(outputPdfPath, printReadyPdfPath);

  // Export 2x Retina PNG
  await page.screenshot({
    path: path.resolve(__dirname, '../public/banner-assets/sparta-summer-camp-banner.png'),
    type: 'png'
  });

  await browser.close();

  console.log(`✅ Flawless Master Sparta A4 PDF with perfect proportions generated at: ${outputPdfPath}`);
  console.log(`✅ Flawless Master Sparta A4 PNG generated at: ${path.resolve(__dirname, '../public/banner-assets/sparta-summer-camp-banner.png')}`);
}

exportPerfectPdf().catch(err => {
  console.error('❌ PDF Export Error:', err);
  process.exit(1);
});
