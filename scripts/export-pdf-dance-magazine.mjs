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

async function exportDanceMagazinePoster() {
  const outputPdfPath = path.resolve(__dirname, '../public/banner-assets/dance-stage-realism-banner.pdf');
  const outputPngPath = path.resolve(__dirname, '../public/banner-assets/dance-stage-realism-banner.png');
  const printReadyPdfPath = path.resolve(__dirname, '../public/dance-stage-realism-print-ready.pdf');
  const standaloneHtmlPath = path.resolve(__dirname, '../public/dance-modern-standalone.html');

  const bgPhotoB64 = getBase64('public/banner-assets/dance-kids-hero-split.jpg');
  const iconBalletB64 = getBase64('public/banner-assets/icon-3d-ballet.png');
  const iconStretchB64 = getBase64('public/banner-assets/icon-3d-stretch.png');
  const iconRhythmB64 = getBase64('public/banner-assets/icon-3d-rhythm.png');
  const iconLightningB64 = getBase64('public/banner-assets/icon-3d-lightning.png');
  const iconSneakerB64 = getBase64('public/banner-assets/icon-3d-sneaker.png');
  const iconTrophyB64 = getBase64('public/banner-assets/icon-3d-trophy.png');
  const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

  let htmlContent = fs.readFileSync(path.resolve(__dirname, '../public/banner-dance-magazine.html'), 'utf-8');
  
  // Embed base64 images
  htmlContent = htmlContent.replace('/banner-assets/dance-kids-hero-split.jpg', bgPhotoB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-ballet.png', iconBalletB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-stretch.png', iconStretchB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-rhythm.png', iconRhythmB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-lightning.png', iconLightningB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-sneaker.png', iconSneakerB64);
  htmlContent = htmlContent.replace('/banner-assets/icon-3d-trophy.png', iconTrophyB64);
  htmlContent = htmlContent.replace('/banner-assets/vk-qr-real.png', realQrB64);

  fs.writeFileSync(standaloneHtmlPath, htmlContent, 'utf-8');

  console.log('🚀 Launching Puppeteer for Cinematic Magazine Editorial Dance Poster (A4 • 1240×1754 • 300 DPI)...');

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
    path: outputPngPath,
    type: 'png'
  });

  await browser.close();

  console.log(`✅ Flawless Cinematic Magazine Dance Poster PDF generated at: ${outputPdfPath}`);
  console.log(`✅ Flawless Cinematic Magazine Dance Poster PNG generated at: ${outputPngPath}`);
}

exportDanceMagazinePoster().catch(err => {
  console.error('❌ Dance Poster Export Error:', err);
  process.exit(1);
});
