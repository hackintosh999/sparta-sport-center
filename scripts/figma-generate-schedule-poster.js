// ============================================================================
// FIGMA POSTER GENERATOR: РАСПИСАНИЕ НАПРАВЛЕНИЙ • ЦСП «СПАРТА»
// Корневой фрейм: "schedule-poster 1" (1080 × 1920 px)
// Структура: 8 независимых карточек с Auto Layout (Top / Pack, 16px/14px gaps)
// ============================================================================

(async function createSpartaSectionCardsPoster() {
  console.log("🎨 Создание постера из 8 независимых карточек с выравниванием Top/Pack в Figma...");

  // 1. Загрузка шрифтов Inter
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Extra Bold" });
  } catch (e) {
    try {
      await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      await figma.loadFontAsync({ family: "Roboto", style: "Bold" });
    } catch (e2) {}
  }

  // 2. Цветовая палитра
  const C = {
    canvasBase: { r: 250 / 255, g: 247 / 255, b: 242 / 255 },       // #FAF7F2
    cardBg: { r: 1, g: 1, b: 1 },                                    // #FFFFFF
    cardBorder: { r: 239 / 255, g: 232 / 255, b: 222 / 255 },       // #EFE8DE
    slotBg: { r: 250 / 255, g: 247 / 255, b: 242 / 255 },            // #FAF7F2
    timeBadgeBg: { r: 247 / 255, g: 239 / 255, b: 230 / 255 },      // #F7EFE6
    dividerSoft: { r: 243 / 255, g: 237 / 255, b: 228 / 255 },      // #F3EDE4
    
    headings: { r: 43 / 255, g: 33 / 255, b: 24 / 255 },            // #2B2118 Deep Espresso
    subtitleDark: { r: 55 / 255, g: 65 / 255, b: 81 / 255 },        // #374151 Контрастный темно-серый
    tagTextDark: { r: 75 / 255, g: 85 / 255, b: 99 / 255 },         // #4B5563 Контрастный тег
    textTaupe: { r: 115 / 255, g: 99 / 255, b: 87 / 255 },          // #736357 Warm Taupe
    
    terracotta: { r: 224 / 255, g: 109 / 255, b: 68 / 255 },        // #E06D44
    sageGreen: { r: 59 / 255, g: 105 / 255, b: 85 / 255 },          // #3B6955
    amber: { r: 217 / 255, g: 119 / 255, b: 6 / 255 },              // #D97706
    indigo: { r: 88 / 255, g: 80 / 255, b: 236 / 255 },             // #5850EC
    
    headerBadgeBg: { r: 253 / 255, g: 238 / 255, b: 217 / 255 },    // #FDEED9
    headerBadgeBorder: { r: 247 / 255, g: 213 / 255, b: 176 / 255 },// #F7D5B0
    headerBadgeText: { r: 184 / 255, g: 74 / 255, b: 40 / 255 },    // #B84A28
    
    glowSun: { r: 252 / 255, g: 211 / 255, b: 77 / 255 },
    glowPeach: { r: 248 / 255, g: 113 / 255, b: 113 / 255 },
    
    footerBg: { r: 43 / 255, g: 33 / 255, b: 24 / 255 },
    footerSub: { r: 196 / 255, g: 181 / 255, b: 165 / 255 },
    footerLight: { r: 229 / 255, g: 221 / 255, b: 212 / 255 },
    white: { r: 1, g: 1, b: 1 }
  };

  function createText(characters, size, weight = "Bold", color = C.headings, align = "LEFT") {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: weight };
    t.fontSize = size;
    t.characters = characters;
    t.fills = [{ type: 'SOLID', color: color }];
    t.textAlignHorizontal = align;
    return t;
  }

  function createBadge(text, bg, textColor, fontSize = 13, weight = "Bold", radius = 100, padX = 14, padY = 6, strokeColor = null) {
    const badge = figma.createFrame();
    badge.name = `Badge: ${text}`;
    badge.layoutMode = "HORIZONTAL";
    badge.primaryAxisAlignItems = "CENTER";
    badge.counterAxisAlignItems = "CENTER";
    badge.paddingLeft = padX;
    badge.paddingRight = padX;
    badge.paddingTop = padY;
    badge.paddingBottom = padY;
    badge.cornerRadius = radius;
    badge.fills = [{ type: 'SOLID', color: bg }];
    if (strokeColor) {
      badge.strokes = [{ type: 'SOLID', color: strokeColor }];
      badge.strokeWeight = 1;
    }
    const label = createText(text, fontSize, weight, textColor);
    badge.appendChild(label);
    return badge;
  }

  // Создание отдельной независимой карточки направления с Top/Pack Auto Layout
  function createDirectionCard({ id, title, hall, benefit, iconKey, barColor, badgeText, badgeTime, slots }) {
    const card = figma.createFrame();
    card.name = id;
    card.layoutMode = "VERTICAL";
    // 1. Изменение распределения: выравнивание по верхнему краю (Top / Pack)
    card.primaryAxisAlignItems = "MIN";
    card.counterAxisAlignItems = "STRETCH";
    card.paddingTop = 18;
    card.paddingBottom = 16;
    card.paddingLeft = 20;
    card.paddingRight = 20;
    card.cornerRadius = 22;
    card.resize(486, 308);
    card.fills = [{ type: 'SOLID', color: C.cardBg }];
    card.strokes = [{ type: 'SOLID', color: C.cardBorder }];
    card.strokeWeight = 1;
    card.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 120 / 255, g: 80 / 255, b: 40 / 255, a: 0.04 },
      offset: { x: 0, y: 8 },
      radius: 24,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL'
    }];

    // 1. Верхний акцентный штрих
    const topBar = figma.createFrame();
    topBar.name = "Top_Accent_Bar";
    topBar.layoutAlign = "STRETCH";
    topBar.resize(446, 4);
    topBar.cornerRadius = 2;
    topBar.fills = [{ type: 'SOLID', color: barColor }];
    card.appendChild(topBar);

    // 2. Блок 1: Header + Subtitle + Divider
    const topSection = figma.createFrame();
    topSection.name = "Card_Top_Section";
    topSection.layoutMode = "VERTICAL";
    topSection.layoutAlign = "STRETCH";
    topSection.itemSpacing = 8;
    topSection.fills = [];

    const headFrame = figma.createFrame();
    headFrame.name = "Header_Block";
    headFrame.layoutMode = "HORIZONTAL";
    headFrame.layoutAlign = "STRETCH";
    headFrame.itemSpacing = 14;
    headFrame.counterAxisAlignItems = "CENTER";
    headFrame.fills = [];

    const iconSlot = figma.createFrame();
    iconSlot.name = `3D_Icon_${iconKey}`;
    iconSlot.resize(48, 48);
    iconSlot.cornerRadius = 8;
    iconSlot.fills = [];
    headFrame.appendChild(iconSlot);

    const titleStack = figma.createFrame();
    titleStack.name = "Title_Stack";
    titleStack.layoutMode = "VERTICAL";
    titleStack.itemSpacing = 3;
    titleStack.layoutGrow = 1;
    titleStack.fills = [];

    const titleRow = figma.createFrame();
    titleRow.name = "Title_Row";
    titleRow.layoutMode = "HORIZONTAL";
    titleRow.itemSpacing = 6;
    titleRow.counterAxisAlignItems = "CENTER";
    titleRow.fills = [];

    const titleLabel = createText(title, 16.5, "Bold", C.headings);
    const hallBadge = createBadge(hall, C.timeBadgeBg, C.tagTextDark, 12, "Semi Bold", 6, 8, 2);
    titleRow.appendChild(titleLabel);
    titleRow.appendChild(hallBadge);
    titleStack.appendChild(titleRow);

    // 2. Подзаголовок: #374151, 13.5px
    const benefitLabel = createText(benefit, 13.5, "Medium", C.subtitleDark);
    titleStack.appendChild(benefitLabel);
    headFrame.appendChild(titleStack);
    topSection.appendChild(headFrame);

    const divider = figma.createFrame();
    divider.name = "Divider";
    divider.layoutAlign = "STRETCH";
    divider.resize(446, 1);
    divider.fills = [{ type: 'SOLID', color: C.dividerSoft }];
    topSection.appendChild(divider);
    card.appendChild(topSection);

    // Gap: 16px между Header и Schedule List
    const spacer1 = figma.createFrame();
    spacer1.name = "Gap_16px";
    spacer1.resize(446, 16);
    spacer1.fills = [];
    card.appendChild(spacer1);

    // 3. Блок 2: Schedule Slots List
    const slotsStack = figma.createFrame();
    slotsStack.name = "Slots_Stack";
    slotsStack.layoutMode = "VERTICAL";
    slotsStack.layoutAlign = "STRETCH";
    slotsStack.itemSpacing = 8;
    slotsStack.fills = [];

    slots.forEach(slot => {
      const slotRow = figma.createFrame();
      slotRow.name = `Slot: ${slot.group}`;
      slotRow.layoutMode = "HORIZONTAL";
      slotRow.layoutAlign = "STRETCH";
      slotRow.primaryAxisAlignItems = "SPACE_BETWEEN";
      slotRow.counterAxisAlignItems = "CENTER";
      slotRow.paddingTop = 10;
      slotRow.paddingBottom = 10;
      slotRow.paddingLeft = 14;
      slotRow.paddingRight = 14;
      slotRow.cornerRadius = 12;
      slotRow.fills = [{ type: 'SOLID', color: slot.isCustom ? C.timeBadgeBg : C.slotBg }];

      const leftTag = figma.createFrame();
      leftTag.name = "Group_Info";
      leftTag.layoutMode = "HORIZONTAL";
      leftTag.itemSpacing = 7;
      leftTag.counterAxisAlignItems = "CENTER";
      leftTag.fills = [];

      const dot = figma.createEllipse();
      dot.resize(7, 7);
      dot.fills = [{ type: 'SOLID', color: barColor }];
      leftTag.appendChild(dot);

      const groupTxt = createText(slot.group, 13.5, slot.isCustom ? "Bold" : "Semi Bold", C.headings);
      leftTag.appendChild(groupTxt);
      slotRow.appendChild(leftTag);

      const rightTag = figma.createFrame();
      rightTag.name = "Timing_Badge";
      rightTag.layoutMode = "HORIZONTAL";
      rightTag.itemSpacing = 6;
      rightTag.counterAxisAlignItems = "CENTER";
      rightTag.fills = [];

      const daysTxt = createText(slot.days, 13, "Bold", C.subtitleDark);
      rightTag.appendChild(daysTxt);

      const timeBadge = createBadge(slot.time, slot.isCustom ? C.white : C.timeBadgeBg, C.headings, 13, "Bold", 8, 10, 4);
      rightTag.appendChild(timeBadge);

      slotRow.appendChild(rightTag);
      slotsStack.appendChild(slotRow);
    });
    card.appendChild(slotsStack);

    // Gap: 14px между Schedule List и Footer Tag
    const spacer2 = figma.createFrame();
    spacer2.name = "Gap_14px";
    spacer2.resize(446, 14);
    spacer2.fills = [];
    card.appendChild(spacer2);

    // 4. Блок 3: Нижняя плашка-тег (#4B5563)
    const bottomBadge = figma.createFrame();
    bottomBadge.name = "Card_Footer_Badge";
    bottomBadge.layoutMode = "HORIZONTAL";
    bottomBadge.layoutAlign = "STRETCH";
    bottomBadge.primaryAxisAlignItems = "SPACE_BETWEEN";
    bottomBadge.counterAxisAlignItems = "CENTER";
    bottomBadge.paddingTop = 6;
    bottomBadge.paddingBottom = 6;
    bottomBadge.paddingLeft = 12;
    bottomBadge.paddingRight = 12;
    bottomBadge.cornerRadius = 8;
    bottomBadge.fills = [{ type: 'SOLID', color: C.slotBg }];

    bottomBadge.appendChild(createText(badgeText, 12, "Semi Bold", C.tagTextDark));
    bottomBadge.appendChild(createText(badgeTime, 12, "Semi Bold", C.tagTextDark));
    card.appendChild(bottomBadge);

    return card;
  }

  // Главный холст (root frame: "schedule-poster 1")
  const poster = figma.createFrame();
  poster.name = "schedule-poster 1";
  poster.resize(1080, 1920);
  poster.x = 0;
  poster.y = 0;
  poster.fills = [{ type: 'SOLID', color: C.canvasBase }];
  poster.clipsContent = true;

  // Декоративные орбы
  const orbTop = figma.createEllipse();
  orbTop.name = "Sun_Glow_Orb";
  orbTop.resize(420, 420);
  orbTop.x = 760;
  orbTop.y = -80;
  orbTop.fills = [{ type: 'SOLID', color: C.glowSun, opacity: 0.25 }];
  orbTop.effects = [{ type: 'LAYER_BLUR', radius: 80, visible: true }];
  poster.appendChild(orbTop);

  const orbBottom = figma.createEllipse();
  orbBottom.name = "Peach_Glow_Orb";
  orbBottom.resize(400, 400);
  orbBottom.x = -80;
  orbBottom.y = 1500;
  orbBottom.fills = [{ type: 'SOLID', color: C.glowPeach, opacity: 0.16 }];
  orbBottom.effects = [{ type: 'LAYER_BLUR', radius: 90, visible: true }];
  poster.appendChild(orbBottom);

  // Контейнер Auto Layout
  const mainContainer = figma.createFrame();
  mainContainer.name = "Main_Layout";
  mainContainer.resize(1080, 1920);
  mainContainer.layoutMode = "VERTICAL";
  mainContainer.primaryAxisAlignItems = "SPACE_BETWEEN";
  mainContainer.counterAxisAlignItems = "STRETCH";
  mainContainer.paddingTop = 54;
  mainContainer.paddingBottom = 48;
  mainContainer.paddingLeft = 44;
  mainContainer.paddingRight = 44;
  mainContainer.itemSpacing = 24;
  mainContainer.fills = [];

  // 1. Header (ул. Ласковая, 26)
  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.layoutAlign = "STRETCH";
  header.primaryAxisAlignItems = "CENTER";
  header.counterAxisAlignItems = "CENTER";
  header.itemSpacing = 8;
  header.fills = [];

  const brandCapsule = createBadge("✨ ЦСП СПАРТА • ДЕТСКИЙ СПОРТ", C.headerBadgeBg, C.headerBadgeText, 14.5, "Bold", 100, 20, 6, C.headerBadgeBorder);
  brandCapsule.name = "Brand_Badge";
  header.appendChild(brandCapsule);

  const mainTitle = createText("РАСПИСАНИЕ СЕКЦИЙ", 42, "Extra Bold", C.headings, "CENTER");
  mainTitle.letterSpacing = { value: -0.5, unit: 'PIXELS' };
  header.appendChild(mainTitle);

  const locStack = figma.createFrame();
  locStack.name = "Location_Info";
  locStack.layoutMode = "VERTICAL";
  locStack.primaryAxisAlignItems = "CENTER";
  locStack.counterAxisAlignItems = "CENTER";
  locStack.itemSpacing = 2;
  locStack.fills = [];
  locStack.appendChild(createText("Детский сад «Солнышко» • ЖК «Парковый Premium»", 20, "Bold", C.terracotta, "CENTER"));
  locStack.appendChild(createText("ул. Ласковая, 26 • Сезон 2026/2027", 15, "Medium", C.textTaupe, "CENTER"));
  header.appendChild(locStack);
  mainContainer.appendChild(header);

  // 2. Сетка из 8 карточек (4 ряда по 2 карточки)
  const gridFrame = figma.createFrame();
  gridFrame.name = "Sections_Grid";
  gridFrame.layoutMode = "VERTICAL";
  gridFrame.layoutAlign = "STRETCH";
  gridFrame.itemSpacing = 20;
  gridFrame.fills = [];

  // Ряд 1: Танцы и Цигун
  const row1 = figma.createFrame();
  row1.name = "Row_1";
  row1.layoutMode = "HORIZONTAL";
  row1.layoutAlign = "STRETCH";
  row1.itemSpacing = 20;
  row1.fills = [];
  row1.appendChild(createDirectionCard({
    id: "Card_Dance",
    title: "Школа танцев",
    hall: "Музыкальный зал 🏡",
    benefit: "Красивая осанка, гибкость, пластика и чувство ритма.",
    badgeText: "🩰 Ритмика и базовая хореография",
    badgeTime: "⏱ 30 мин",
    iconKey: "dance",
    barColor: C.sageGreen,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "17:30" }
    ]
  }));
  row1.appendChild(createDirectionCard({
    id: "Card_Qigong",
    title: "Оздоровительный цигун",
    hall: "Музыкальный зал 🏡",
    benefit: "Здоровый рост, позвоночник, гибкость и спокойствие.",
    badgeText: "🌿 Мягкая гимнастика и дыхание",
    badgeTime: "⏱ 30 мин",
    iconKey: "qigong",
    barColor: C.sageGreen,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "16:30" }
    ]
  }));
  gridFrame.appendChild(row1);

  // Ряд 2: Чемпион и Единоборства
  const row2 = figma.createFrame();
  row2.name = "Row_2";
  row2.layoutMode = "HORIZONTAL";
  row2.layoutAlign = "STRETCH";
  row2.itemSpacing = 20;
  row2.fills = [];
  row2.appendChild(createDirectionCard({
    id: "Card_Champion",
    title: "Проект «Чемпион»",
    hall: "Спортивный зал 🏡",
    benefit: "Спортивная база, качественное ОФП, растяжка и характер.",
    badgeText: "⚡ 3 раза в неделю для супер-формы",
    badgeTime: "⏱ 30 мин",
    iconKey: "champion",
    barColor: C.terracotta,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср, Пт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср, Пт", time: "16:30" }
    ]
  }));
  row2.appendChild(createDirectionCard({
    id: "Card_Martial",
    title: "Боевые искусства",
    hall: "Спортивный зал 🏡",
    benefit: "ОФП, дисциплина, уверенность в себе и самооборона.",
    badgeText: "🛡 Самооборона и координация",
    badgeTime: "⏱ 30 мин",
    iconKey: "martial",
    barColor: C.terracotta,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср, Пт", time: "17:30" }
    ]
  }));
  gridFrame.appendChild(row2);

  // Ряд 3: Легоконструирование и Английский язык
  const row3 = figma.createFrame();
  row3.name = "Row_3";
  row3.layoutMode = "HORIZONTAL";
  row3.layoutAlign = "STRETCH";
  row3.itemSpacing = 20;
  row3.fills = [];
  row3.appendChild(createDirectionCard({
    id: "Card_Lego",
    title: "Легоконструирование",
    hall: "Зал ИЗО 🏡",
    benefit: "Сборка моделей, логика, моторика и основы IT.",
    badgeText: "🤖 Моделирование и основы IT",
    badgeTime: "⏱ 30 мин",
    iconKey: "lego",
    barColor: C.amber,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Пн, Ср", time: "17:00" },
      { group: "Старшая группа (5–7 лет)", days: "Пн, Ср", time: "17:30" }
    ]
  }));
  row3.appendChild(createDirectionCard({
    id: "Card_English",
    title: "Английский язык",
    hall: "Зал ИЗО 🏡",
    benefit: "Игровой формат, расширение словаря и произношение.",
    badgeText: "🗣 Разговорная практика в играх",
    badgeTime: "⏱ 30 мин",
    iconKey: "english",
    barColor: C.indigo,
    slots: [
      { group: "Младшая группа (2–4 года)", days: "Вт, Чт", time: "16:00" },
      { group: "Старшая группа (5–7 лет)", days: "Вт, Чт", time: "16:30" }
    ]
  }));
  gridFrame.appendChild(row3);

  // Ряд 4: Подготовка к школе и Логопед
  const row4 = figma.createFrame();
  row4.name = "Row_4";
  row4.layoutMode = "HORIZONTAL";
  row4.layoutAlign = "STRETCH";
  row4.itemSpacing = 20;
  row4.fills = [];
  row4.appendChild(createDirectionCard({
    id: "Card_School",
    title: "Подготовка к школе",
    hall: "Зал ИЗО 🏡",
    benefit: "Лёгкий старт перед 1 классом: чтение, письмо, счёт.",
    badgeText: "📖 Интеллектуальное развитие",
    badgeTime: "⏱ 45 мин",
    iconKey: "school",
    barColor: C.indigo,
    slots: [
      { group: "Старшая группа (6–7 лет)", days: "Вт, Чт", time: "17:00–17:45" },
      { group: "⏱ Комплекс занятий", days: "Чтение • Письмо", time: "45 мин", isCustom: true }
    ]
  }));
  row4.appendChild(createDirectionCard({
    id: "Card_Logoped",
    title: "Логопед",
    hall: "Зал ИЗО 🏡",
    benefit: "Речь, звукопроизношение, постановка звуков.",
    badgeText: "💬 Постановка звуков и словарь",
    badgeTime: "⏱ 30 мин",
    iconKey: "logoped",
    barColor: C.amber,
    slots: [
      { group: "Младшая (2–4 года)", days: "Пн, Ср", time: "16:00" },
      { group: "Старшая (5–7 лет)", days: "Пн, Ср", time: "16:30" },
      { group: "Индивидуально", days: "Пятница", time: "по записи", isCustom: true }
    ]
  }));
  gridFrame.appendChild(row4);

  mainContainer.appendChild(gridFrame);

  // 3. Подвал / Footer_Contacts
  const footer = figma.createFrame();
  footer.name = "Footer_Contacts";
  footer.layoutMode = "HORIZONTAL";
  footer.layoutAlign = "STRETCH";
  footer.primaryAxisAlignItems = "SPACE_BETWEEN";
  footer.counterAxisAlignItems = "CENTER";
  footer.paddingTop = 20;
  footer.paddingBottom = 20;
  footer.paddingLeft = 28;
  footer.paddingRight = 28;
  footer.cornerRadius = 20;
  footer.fills = [{ type: 'SOLID', color: C.footerBg }];

  const leftCol = figma.createFrame();
  leftCol.name = "Left_Contacts";
  leftCol.layoutMode = "VERTICAL";
  leftCol.itemSpacing = 2;
  leftCol.fills = [];
  const subLabel = createText("ЗАПИСЬ И КОНСУЛЬТАЦИИ:", 12, "Medium", C.footerSub);
  subLabel.letterSpacing = { value: 0.8, unit: 'PIXELS' };
  leftCol.appendChild(subLabel);
  leftCol.appendChild(createText("+7 (919) 339-33-99", 25, "Extra Bold", C.canvasBase));
  leftCol.appendChild(createText("Руководитель: Ксения Лебедева", 14.5, "Medium", C.footerLight));
  footer.appendChild(leftCol);

  const rightCol = figma.createFrame();
  rightCol.name = "Right_Note";
  rightCol.layoutMode = "HORIZONTAL";
  rightCol.primaryAxisAlignItems = "CENTER";
  rightCol.counterAxisAlignItems = "CENTER";
  rightCol.itemSpacing = 10;
  rightCol.paddingTop = 12;
  rightCol.paddingBottom = 12;
  rightCol.paddingLeft = 18;
  rightCol.paddingRight = 18;
  rightCol.cornerRadius = 12;
  rightCol.fills = [{ type: 'SOLID', color: C.white, opacity: 0.08 }];

  rightCol.appendChild(createText("👟", 16, "Regular", C.white));
  rightCol.appendChild(createText("Форма: удобная одежда + сменная чистая обувь", 13.5, "Medium", C.footerLight));
  footer.appendChild(rightCol);

  mainContainer.appendChild(footer);
  poster.appendChild(mainContainer);

  figma.currentPage.appendChild(poster);
  figma.currentPage.selection = [poster];
  figma.viewport.scrollAndZoomIntoView([poster]);

  console.log("✅ Постер расписания успешно откалиброван и обновлен в Figma!");
})();
