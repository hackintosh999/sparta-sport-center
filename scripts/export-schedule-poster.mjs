import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportPoster() {
  console.log('🚀 Запуск экспорта корневого фрейма schedule-poster 1...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--force-device-scale-factor=2'
    ]
  });

  const page = await browser.newPage();
  
  // Устанавливаем вьюпорт 1080x1920 с 2x плотностью пикселей (2160x3840)
  await page.setViewport({
    width: 1080,
    height: 1920,
    deviceScaleFactor: 2
  });

  const htmlPath = path.resolve(__dirname, '../public/schedule-poster.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Ждем готовности всех шрифтов и изображений
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1200));

  const posterElement = await page.$('.poster-canvas');
  if (!posterElement) {
    throw new Error('Element .poster-canvas not found');
  }

  // 1. Экспорт в PNG 2x (2160 × 3840 px)
  const pngPath = path.resolve(__dirname, '../public/schedule-poster.png');
  await posterElement.screenshot({
    path: pngPath,
    type: 'png',
    omitBackground: false
  });
  console.log(`✅ PNG 2x (2160×3840) успешно сохранен: ${pngPath}`);

  // 2. Копирование в артефакты для предпросмотра в чате
  const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/10f112bc-4c6c-4da6-81e2-5e586b03cfac';
  if (fs.existsSync(artifactDir)) {
    const artifactImg = path.join(artifactDir, 'schedule_poster_preview.png');
    fs.copyFileSync(pngPath, artifactImg);
    console.log(`✅ Скопировано в артефакты: ${artifactImg}`);
  }

  // 3. Высококачественный экспорт в PDF без обрезки футера
  const pdfPath = path.resolve(__dirname, '../public/schedule-poster.pdf');
  await page.pdf({
    path: pdfPath,
    width: '1080px',
    height: '1920px',
    printBackground: true,
    margin: {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px'
    },
    preferCSSPageSize: true
  });
  console.log(`✅ Векторный PDF для печати успешно сохранен: ${pdfPath}`);

  await browser.close();
  console.log('🎉 Экспорт главного фрейма успешно завершен!');
}

exportPoster().catch(err => {
  console.error('❌ Ошибка при экспорте:', err);
  process.exit(1);
});
