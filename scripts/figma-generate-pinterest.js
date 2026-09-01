// ============================================================================
// FIGMA POSTER GENERATOR: ЦСП «СПАРТА» (PINTEREST STYLE REFERENCE)
// Точная адаптация референса "SMART GOAL SOCCER ACADEMY" для формата А4 (1240 × 1754 px)
//
// Как запустить в Figma:
// 1. В открытом файле Figma нажмите: Ctrl + / (или Cmd + /) -> введите "Open Console"
// 2. Вставьте этот код и нажмите Enter!
// ============================================================================

(async function createSpartaPinterestPoster() {
  console.log("🚀 Создание постера ЦСП Спарта в стиле Pinterest...");

  // 1. Загрузка шрифтов
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Extra Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Black" });
  } catch (e) {
    console.warn("Font loading note:", e);
  }

  // Цвета
  const C = {
    gold: { r: 255 / 255, g: 199 / 255, b: 44 / 255 },       // #FFC72C
    goldDark: { r: 212 / 255, g: 175 / 255, b: 55 / 255 },   // #D4AF37
    emerald: { r: 0 / 255, g: 168 / 255, b: 89 / 255 },     // #00A859
    black: { r: 6 / 255, g: 9 / 255, b: 7 / 255 },           // #060907
    darkHeader: { r: 8 / 255, g: 12 / 255, b: 10 / 255 },    // #080C0A
    cardDark: { r: 13 / 255, g: 19 / 255, b: 16 / 255 },     // #0D1310
    white: { r: 1, g: 1, b: 1 },
    gray: { r: 213 / 255, g: 221 / 255, b: 215 / 255 },
  };

  function createText(chars, size, weight = "Bold", color = C.white, align = "LEFT") {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: weight };
    t.fontSize = size;
    t.characters = chars;
    t.fills = [{ type: 'SOLID', color: color }];
    t.textAlignHorizontal = align;
    return t;
  }

  // Главный фрейм А4 (1240 × 1754)
  const poster = figma.createFrame();
  poster.name = "⭐ Постер А4 (Pinterest Style) • Спарта";
  poster.resize(1240, 1754);
  poster.x = 0;
  poster.y = 0;
  poster.fills = [{ type: 'SOLID', color: C.black }];
  poster.clipsContent = true;

  // 1. Слой стадиона и фото мальчика (нижняя часть)
  const stadiumSection = figma.createFrame();
  stadiumSection.name = "Stadium_Photo_Section [Фото мальчика]";
  stadiumSection.resize(1240, 1300);
  stadiumSection.x = 0;
  stadiumSection.y = 454;
  stadiumSection.fills = [{
    type: 'GRADIENT_RADIAL',
    gradientStops: [
      { position: 0, color: { r: 85/255, g: 68/255, b: 3/255, a: 1 } },
      { position: 0.45, color: { r: 24/255, g: 34/255, b: 10/255, a: 1 } },
      { position: 1, color: { ...C.black, a: 1 } }
    ],
    gradientTransform: [[0.8, 0, 0.1], [0, 0.8, 0.1]]
  }];
  poster.appendChild(stadiumSection);

  // 2. Верхняя шапка с арочным вырезом
  const topHeader = figma.createFrame();
  topHeader.name = "Top_Arch_Header";
  topHeader.resize(1240, 520);
  topHeader.x = 0;
  topHeader.y = 0;
  topHeader.fills = [{ type: 'SOLID', color: C.darkHeader }];
  topHeader.cornerRadius = 0;
  topHeader.bottomLeftRadius = 180;
  topHeader.bottomRightRadius = 180;

  // Локация
  const locText = createText("📍 Г. НОВОСИБИРСК", 19, "Bold", C.white, "CENTER");
  locText.x = 480;
  locText.y = 55;
  locText.letterSpacing = { value: 8, unit: 'PERCENT' };
  topHeader.appendChild(locText);

  // Заголовки (стиль референса)
  const h1Gold = createText("ЦСП «СПАРТА»", 64, "Black", C.gold, "CENTER");
  h1Gold.x = 350;
  h1Gold.y = 95;
  h1Gold.letterSpacing = { value: 4, unit: 'PERCENT' };
  topHeader.appendChild(h1Gold);

  const h1White = createText("ФУТБОЛЬНЫЙ ЦЕНТР", 56, "Black", C.white, "CENTER");
  h1White.x = 290;
  h1White.y = 165;
  h1White.letterSpacing = { value: 2, unit: 'PERCENT' };
  topHeader.appendChild(h1White);

  // Левая колонка: Возраст + Free плашка
  const age = createText("Для детей от 4 до 14 лет", 23, "Semi Bold", C.gold);
  age.x = 75;
  age.y = 265;
  topHeader.appendChild(age);

  const freePill = figma.createFrame();
  freePill.name = "Free_Badge_Pill";
  freePill.layoutMode = "HORIZONTAL";
  freePill.primaryAxisAlignItems = "CENTER";
  freePill.counterAxisAlignItems = "CENTER";
  freePill.paddingLeft = 28;
  freePill.paddingRight = 28;
  freePill.paddingTop = 12;
  freePill.paddingBottom = 12;
  freePill.cornerRadius = 40;
  freePill.fills = [{ type: 'SOLID', color: C.gold }];
  freePill.x = 75;
  freePill.y = 305;
  freePill.appendChild(createText("Первое занятие — БЕСПЛАТНО", 20, "Extra Bold", C.black));
  topHeader.appendChild(freePill);

  // Правая колонка: Буллеты со слэшами //
  const b1 = createText("//  Тренеры с лицензией UEFA", 21, "Bold", C.white);
  b1.x = 780; b1.y = 265;
  topHeader.appendChild(b1);

  const b2 = createText("//  Индивидуальный подход", 21, "Bold", C.white);
  b2.x = 780; b2.y = 305;
  topHeader.appendChild(b2);

  const b3 = createText("//  Мини-группы 8–10 детей", 21, "Bold", C.white);
  b3.x = 780; b3.y = 345;
  topHeader.appendChild(b3);

  poster.appendChild(topHeader);

  // 3. Нижний CTA док
  const bottomDock = figma.createFrame();
  bottomDock.name = "Bottom_CTA_Dock";
  bottomDock.resize(1240, 240);
  bottomDock.x = 0;
  bottomDock.y = 1514;
  bottomDock.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { ...C.black, a: 0 } },
      { position: 0.35, color: { ...C.black, a: 0.95 } },
      { position: 1, color: { ...C.black, a: 1 } }
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]]
  }];

  // CTA Кнопка
  const ctaBtn = figma.createFrame();
  ctaBtn.name = "CTA_Button";
  ctaBtn.layoutMode = "HORIZONTAL";
  ctaBtn.primaryAxisAlignItems = "CENTER";
  ctaBtn.counterAxisAlignItems = "CENTER";
  ctaBtn.resize(1090, 80);
  ctaBtn.cornerRadius = 24;
  ctaBtn.x = 75;
  ctaBtn.y = 20;
  ctaBtn.fills = [{ type: 'SOLID', color: C.gold }];
  ctaBtn.appendChild(createText("ЗАПИСАТЬСЯ НА БЕСПЛАТНУЮ ТРЕНИРОВКУ →", 23, "Black", C.black));
  bottomDock.appendChild(ctaBtn);

  // Контакты
  const infoBar = figma.createFrame();
  infoBar.name = "Contact_Bar";
  infoBar.layoutMode = "HORIZONTAL";
  infoBar.primaryAxisAlignItems = "SPACE_BETWEEN";
  infoBar.counterAxisAlignItems = "CENTER";
  infoBar.paddingLeft = 32;
  infoBar.paddingRight = 32;
  infoBar.resize(1090, 75);
  infoBar.cornerRadius = 20;
  infoBar.x = 75;
  infoBar.y = 115;
  infoBar.fills = [{ type: 'SOLID', color: C.cardDark, opacity: 0.9 }];
  infoBar.strokes = [{ type: 'SOLID', color: C.gold, opacity: 0.4 }];

  infoBar.appendChild(createText("📞 +7 (383) 383-00-15\nЕжедневно 09:00 — 21:00", 17, "Bold", C.white));
  infoBar.appendChild(createText("🎁 Фирменный мяч в подарок", 16, "Bold", C.gold));
  infoBar.appendChild(createText("sparta-sports.ru\nОнлайн-запись", 16, "Bold", C.white));
  bottomDock.appendChild(infoBar);

  poster.appendChild(bottomDock);

  figma.currentPage.selection = [poster];
  figma.viewport.scrollAndZoomIntoView([poster]);
  console.log("✨ Постер в стиле Pinterest успешно сгенерирован в Figma!");
})();
