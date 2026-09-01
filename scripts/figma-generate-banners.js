// ============================================================================
// FIGMA BANNER GENERATOR: ЦСП «СПАРТА» (НОВОСИБИРСК)
// 1. Постер А4 (1240 × 1754 px)
// 2. Роллап (850 × 2000 px)
//
// Как запустить в Figma:
// В открытом файле Figma нажмите: Меню -> Plugins -> Development -> Open Console
// Вставьте этот код целиком и нажмите Enter!
// ============================================================================

(async function createSpartaBanners() {
  console.log("🚀 Создание баннеров ЦСП Спарта...");

  // 1. Загрузка необходимых шрифтов
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Extra Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Black" });
  } catch (e) {
    console.warn("Fallback to Roboto/Inter default", e);
  }

  // Цветовая палитра
  const C = {
    gold: { r: 212 / 255, g: 175 / 255, b: 55 / 255 },       // #D4AF37
    goldLight: { r: 243 / 255, g: 229 / 255, b: 171 / 255 },  // #F3E5AB
    emerald: { r: 0 / 255, g: 168 / 255, b: 89 / 255 },       // #00A859
    emeraldLight: { r: 0 / 255, g: 208 / 255, b: 108 / 255 }, // #00D06C
    dark: { r: 17 / 255, g: 22 / 255, b: 19 / 255 },          // #111613
    darkDeep: { r: 11 / 255, g: 15 / 255, b: 13 / 255 },      // #0B0F0D
    white: { r: 1, g: 1, b: 1 },
    milk: { r: 230 / 255, g: 232 / 255, b: 230 / 255 },       // #E6E8E6
  };

  // Хелпер создания текста
  function createText(characters, size, weight = "Bold", color = C.white, align = "LEFT") {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: weight };
    t.fontSize = size;
    t.characters = characters;
    t.fills = [{ type: 'SOLID', color: color }];
    t.textAlignHorizontal = align;
    return t;
  }

  // ==========================================================================
  // 1. ФРЕЙМ 1: ПОСТЕР А4 (1240 × 1754 px)
  // ==========================================================================
  const poster = figma.createFrame();
  poster.name = "📄 Постер А4 (1240 × 1754) • Спарта";
  poster.resize(1240, 1754);
  poster.x = 0;
  poster.y = 0;
  poster.fills = [{ type: 'SOLID', color: C.darkDeep }];
  poster.clipsContent = true;

  // Top Container (Auto Layout)
  const a4Top = figma.createFrame();
  a4Top.name = "Top_Header_Container";
  a4Top.layoutMode = "VERTICAL";
  a4Top.primaryAxisAlignItems = "MIN";
  a4Top.counterAxisAlignItems = "CENTER";
  a4Top.itemSpacing = 16;
  a4Top.paddingTop = 55;
  a4Top.paddingBottom = 30;
  a4Top.paddingLeft = 70;
  a4Top.paddingRight = 70;
  a4Top.resize(1240, 480);
  a4Top.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { ...C.darkDeep, a: 0.95 } },
      { position: 1, color: { ...C.darkDeep, a: 0 } }
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]]
  }];

  // Badge: Набор детей
  const a4Badge = figma.createFrame();
  a4Badge.name = "Pill_Badge";
  a4Badge.layoutMode = "HORIZONTAL";
  a4Badge.primaryAxisAlignItems = "CENTER";
  a4Badge.counterAxisAlignItems = "CENTER";
  a4Badge.paddingTop = 8;
  a4Badge.paddingBottom = 8;
  a4Badge.paddingLeft = 24;
  a4Badge.paddingRight = 24;
  a4Badge.cornerRadius = 40;
  a4Badge.fills = [{ type: 'SOLID', color: C.gold, opacity: 0.12 }];
  a4Badge.strokes = [{ type: 'SOLID', color: C.gold, opacity: 0.5 }];
  a4Badge.strokeWeight = 1;

  const dot = figma.createEllipse();
  dot.resize(8, 8);
  dot.fills = [{ type: 'SOLID', color: C.emeraldLight }];
  a4Badge.appendChild(dot);
  a4Badge.itemSpacing = 10;

  const badgeText = createText("ОФИЦИАЛЬНЫЙ НАБОР ДЕТЕЙ ОТ 4 ДО 14 ЛЕТ", 15, "Bold", C.goldLight);
  badgeText.letterSpacing = { value: 10, unit: 'PERCENT' };
  a4Badge.appendChild(badgeText);
  a4Top.appendChild(a4Badge);

  // Logo Brand Title
  const brandTitle = createText("ЦСП «СПАРТА» • НОВОСИБИРСК", 24, "Black", C.gold, "CENTER");
  brandTitle.letterSpacing = { value: 6, unit: 'PERCENT' };
  a4Top.appendChild(brandTitle);

  // H1 Title
  const h1 = createText("Футбол для детей: ЦСП «Спарта» открывает набор в Новосибирске", 46, "Black", C.white, "CENTER");
  h1.textAlignHorizontal = "CENTER";
  h1.resize(1100, 115);
  a4Top.appendChild(h1);

  // Soul Text
  const soul = createText(
    "Воспитываем характер, развиваем силу и лидерские качества с ранних лет в атмосфере дружбы, профессионализма и поддержки каждого ребенка.",
    19, "Regular", C.milk, "CENTER"
  );
  soul.textAlignHorizontal = "CENTER";
  soul.resize(900, 55);
  a4Top.appendChild(soul);

  poster.appendChild(a4Top);

  // Center Art Placeholder Frame (place your image here)
  const centerArt = figma.createFrame();
  centerArt.name = "Center_Art_Photo [Вставьте сюда фото мальчика с мячом]";
  centerArt.resize(1240, 800);
  centerArt.x = 0;
  centerArt.y = 420;
  centerArt.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.2 }];
  poster.appendChild(centerArt);

  // Bottom Container (Cards + Footer)
  const a4Bottom = figma.createFrame();
  a4Bottom.name = "Bottom_Cards_And_Footer";
  a4Bottom.layoutMode = "VERTICAL";
  a4Bottom.primaryAxisAlignItems = "MAX";
  a4Bottom.counterAxisAlignItems = "CENTER";
  a4Bottom.itemSpacing = 22;
  a4Bottom.paddingLeft = 60;
  a4Bottom.paddingRight = 60;
  a4Bottom.paddingBottom = 45;
  a4Bottom.paddingTop = 60;
  a4Bottom.resize(1240, 560);
  a4Bottom.x = 0;
  a4Bottom.y = 1194;
  a4Bottom.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { ...C.darkDeep, a: 0 } },
      { position: 0.35, color: { ...C.darkDeep, a: 0.85 } },
      { position: 1, color: { ...C.darkDeep, a: 1 } }
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]]
  }];

  // Cards Row (Horizontal Auto Layout)
  const cardsRow = figma.createFrame();
  cardsRow.name = "Cards_Row";
  cardsRow.layoutMode = "HORIZONTAL";
  cardsRow.itemSpacing = 20;
  cardsRow.resize(1120, 140);
  cardsRow.fills = [];

  function createCard(valText, titleText, descText, isEmerald = false) {
    const card = figma.createFrame();
    card.layoutMode = "VERTICAL";
    card.primaryAxisAlignItems = "SPACE_BETWEEN";
    card.paddingTop = 20;
    card.paddingBottom = 20;
    card.paddingLeft = 20;
    card.paddingRight = 20;
    card.cornerRadius = 18;
    card.resize(360, 140);
    card.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.75 }];
    card.strokes = [{ type: 'SOLID', color: isEmerald ? C.emeraldLight : C.gold, opacity: isEmerald ? 0.7 : 0.45 }];
    card.strokeWeight = 1;

    const val = createText(valText, 28, "Black", isEmerald ? C.emeraldLight : C.gold);
    const title = createText(titleText, 17, "Bold", C.white);
    const desc = createText(descText, 13, "Regular", C.milk);
    desc.resize(320, 36);

    card.appendChild(val);
    card.appendChild(title);
    card.appendChild(desc);
    return card;
  }

  cardsRow.appendChild(createCard("0 ₽", "Пробная тренировка", "Бесплатное первое занятие и оценка тренера", true));
  cardsRow.appendChild(createCard("Мяч в подарок ⚽", "Фирменный подарок", "Дарим мяч SPARTA при покупке абонемента"));
  cardsRow.appendChild(createCard("Гослицензия 🏆", "Лицензия + Заморозка", "Официальная программа и вычет 13%"));
  a4Bottom.appendChild(cardsRow);

  // CTA Button
  const ctaBtn = figma.createFrame();
  ctaBtn.name = "CTA_Button";
  ctaBtn.layoutMode = "HORIZONTAL";
  ctaBtn.primaryAxisAlignItems = "CENTER";
  ctaBtn.counterAxisAlignItems = "CENTER";
  ctaBtn.resize(1120, 75);
  ctaBtn.cornerRadius = 20;
  ctaBtn.fills = [{ type: 'SOLID', color: C.emerald }];
  ctaBtn.strokes = [{ type: 'SOLID', color: C.gold }];
  ctaBtn.strokeWeight = 2;

  const ctaText = createText("ЗАПИСАТЬСЯ НА БЕСПЛАТНУЮ ТРЕНИРОВКУ →", 21, "Extra Bold", C.white);
  ctaText.letterSpacing = { value: 4, unit: 'PERCENT' };
  ctaBtn.appendChild(ctaText);
  a4Bottom.appendChild(ctaBtn);

  // Footer Contact Bar
  const contactBar = figma.createFrame();
  contactBar.name = "Contact_Bar";
  contactBar.layoutMode = "HORIZONTAL";
  contactBar.primaryAxisAlignItems = "SPACE_BETWEEN";
  contactBar.counterAxisAlignItems = "CENTER";
  contactBar.paddingLeft = 28;
  contactBar.paddingRight = 28;
  contactBar.paddingTop = 16;
  contactBar.paddingBottom = 16;
  contactBar.resize(1120, 80);
  contactBar.cornerRadius = 20;
  contactBar.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.85 }];
  contactBar.strokes = [{ type: 'SOLID', color: C.gold, opacity: 0.3 }];
  contactBar.strokeWeight = 1;

  const phoneBox = figma.createFrame();
  phoneBox.layoutMode = "VERTICAL";
  phoneBox.fills = [];
  phoneBox.appendChild(createText("📞 +7 (383) 383-00-15", 19, "Bold", C.white));
  phoneBox.appendChild(createText("Ежедневно 09:00 — 21:00", 13, "Regular", C.milk));
  contactBar.appendChild(phoneBox);

  const cityBox = figma.createFrame();
  cityBox.layoutMode = "VERTICAL";
  cityBox.fills = [];
  cityBox.appendChild(createText("📍 г. Новосибирск", 19, "Bold", C.white));
  cityBox.appendChild(createText("Удобные залы в вашем районе", 13, "Regular", C.milk));
  contactBar.appendChild(cityBox);

  const qrBox = figma.createFrame();
  qrBox.layoutMode = "VERTICAL";
  qrBox.fills = [];
  qrBox.appendChild(createText("📱 sparta-sports.ru", 16, "Bold", C.goldLight));
  qrBox.appendChild(createText("Онлайн-запись", 13, "Regular", C.milk));
  contactBar.appendChild(qrBox);

  a4Bottom.appendChild(contactBar);
  poster.appendChild(a4Bottom);

  // ==========================================================================
  // 2. ФРЕЙМ 2: РОЛЛАП (850 × 2000 px)
  // ==========================================================================
  const rollup = figma.createFrame();
  rollup.name = "🚩 Роллап (850 × 2000) • Спарта";
  rollup.resize(850, 2000);
  rollup.x = 1350;
  rollup.y = 0;
  rollup.fills = [{ type: 'SOLID', color: C.darkDeep }];
  rollup.clipsContent = true;

  // Rollup Top
  const rTop = figma.createFrame();
  rTop.name = "Rollup_Top";
  rTop.layoutMode = "VERTICAL";
  rTop.counterAxisAlignItems = "CENTER";
  rTop.itemSpacing = 16;
  rTop.paddingTop = 65;
  rTop.paddingLeft = 50;
  rTop.paddingRight = 50;
  rTop.resize(850, 480);
  rTop.fills = [];

  const rBrand = createText("ЦСП «СПАРТА» • НОВОСИБИРСК", 22, "Black", C.gold, "CENTER");
  rBrand.letterSpacing = { value: 6, unit: 'PERCENT' };
  rTop.appendChild(rBrand);

  const rH1 = createText("Футбол для детей:\nЦСП «Спарта» открывает набор\nв Новосибирске", 38, "Black", C.white, "CENTER");
  rH1.textAlignHorizontal = "CENTER";
  rH1.resize(750, 140);
  rTop.appendChild(rH1);

  const rSoul = createText("Воспитываем будущих чемпионов: дисциплина, ловкость, командный дух и уверенность в себе с 4 до 14 лет.", 17, "Regular", C.milk, "CENTER");
  rSoul.textAlignHorizontal = "CENTER";
  rSoul.resize(700, 50);
  rTop.appendChild(rSoul);

  rollup.appendChild(rTop);

  // Rollup Center Art Frame
  const rArt = figma.createFrame();
  rArt.name = "Center_Art_Photo [Фото мальчика]";
  rArt.resize(850, 850);
  rArt.x = 0;
  rArt.y = 480;
  rArt.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.2 }];
  rollup.appendChild(rArt);

  // Rollup Bottom
  const rBottom = figma.createFrame();
  rBottom.name = "Rollup_Bottom_Cards_And_CTA";
  rBottom.layoutMode = "VERTICAL";
  rBottom.itemSpacing = 18;
  rBottom.paddingLeft = 50;
  rBottom.paddingRight = 50;
  rBottom.paddingBottom = 160; // 150px safety margin
  rBottom.resize(850, 750);
  rBottom.x = 0;
  rBottom.y = 1250;
  rBottom.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { ...C.darkDeep, a: 0 } },
      { position: 0.4, color: { ...C.darkDeep, a: 0.95 } },
      { position: 1, color: { ...C.darkDeep, a: 1 } }
    ],
    gradientTransform: [[0, 1, 0], [-1, 0, 1]]
  }];

  function createRollupCard(badgeText, titleText, descText, isHighlight = false) {
    const card = figma.createFrame();
    card.layoutMode = "HORIZONTAL";
    card.counterAxisAlignItems = "CENTER";
    card.itemSpacing = 18;
    card.paddingTop = 16;
    card.paddingBottom = 16;
    card.paddingLeft = 20;
    card.paddingRight = 20;
    card.cornerRadius = 16;
    card.resize(750, 75);
    card.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.8 }];
    card.strokes = [{ type: 'SOLID', color: isHighlight ? C.emeraldLight : C.gold, opacity: isHighlight ? 0.7 : 0.4 }];
    card.strokeWeight = 1;

    const badge = createText(badgeText, 20, "Black", isHighlight ? C.emeraldLight : C.gold);
    badge.resize(130, 26);
    card.appendChild(badge);

    const info = figma.createFrame();
    info.layoutMode = "VERTICAL";
    info.itemSpacing = 4;
    info.fills = [];
    info.appendChild(createText(titleText, 16, "Bold", C.white));
    info.appendChild(createText(descText, 12, "Regular", C.milk));
    card.appendChild(info);

    return card;
  }

  rBottom.appendChild(createRollupCard("0 ₽", "Пробная тренировка", "Бесплатное первое занятие и знакомство с тренером", true));
  rBottom.appendChild(createRollupCard("МЯЧ ⚽", "Мяч в подарок", "Фирменный футбольный мяч SPARTA при покупке абонемента"));
  rBottom.appendChild(createRollupCard("ЛИЦЕНЗИЯ", "Гослицензия + Заморозка", "Официальный статус, налоговый вычет 13% и сохранение баланса"));

  // Rollup CTA
  const rCta = figma.createFrame();
  rCta.layoutMode = "HORIZONTAL";
  rCta.primaryAxisAlignItems = "CENTER";
  rCta.counterAxisAlignItems = "CENTER";
  rCta.resize(750, 72);
  rCta.cornerRadius = 18;
  rCta.fills = [{ type: 'SOLID', color: C.emerald }];
  rCta.strokes = [{ type: 'SOLID', color: C.gold }];
  rCta.strokeWeight = 2;
  rCta.appendChild(createText("ЗАПИСАТЬСЯ НА БЕСПЛАТНУЮ ТРЕНИРОВКУ", 19, "Extra Bold", C.white));
  rBottom.appendChild(rCta);

  // Rollup Contacts
  const rContacts = figma.createFrame();
  rContacts.layoutMode = "HORIZONTAL";
  rContacts.primaryAxisAlignItems = "SPACE_BETWEEN";
  rContacts.counterAxisAlignItems = "CENTER";
  rContacts.paddingLeft = 24;
  rContacts.paddingRight = 24;
  rContacts.paddingTop = 14;
  rContacts.paddingBottom = 14;
  rContacts.resize(750, 75);
  rContacts.cornerRadius = 18;
  rContacts.fills = [{ type: 'SOLID', color: C.dark, opacity: 0.9 }];
  rContacts.strokes = [{ type: 'SOLID', color: C.gold, opacity: 0.3 }];
  rContacts.strokeWeight = 1;

  const rInfoCol = figma.createFrame();
  rInfoCol.layoutMode = "VERTICAL";
  rInfoCol.fills = [];
  rInfoCol.appendChild(createText("📞 +7 (383) 383-00-15", 19, "Bold", C.white));
  rInfoCol.appendChild(createText("📍 г. Новосибирск | sparta-sports.ru", 13, "Regular", C.goldLight));
  rContacts.appendChild(rInfoCol);
  rBottom.appendChild(rContacts);

  rollup.appendChild(rBottom);

  figma.currentPage.selection = [poster, rollup];
  figma.viewport.scrollAndZoomIntoView([poster, rollup]);

  console.log("✨ Успешно созданы 2 фрейма: Постер А4 и Роллап со всеми Auto Layout и стилями!");
})();
