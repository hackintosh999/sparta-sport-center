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

async function exportDancePdfAndPng() {
  const outputPdfPath = path.resolve(__dirname, '../public/banner-assets/dance-lotus-soma-banner.pdf');
  const outputPngPath = path.resolve(__dirname, '../public/banner-assets/dance-lotus-soma-banner.png');
  const printReadyPdfPath = path.resolve(__dirname, '../public/dance-lotus-soma-print-ready.pdf');
  const standaloneHtmlPath = path.resolve(__dirname, '../public/dance-print-standalone.html');

  const silkBgB64 = getBase64('public/banner-assets/dance-silk-bg.jpg');
  const logoB64 = getBase64('public/logo-gold.png');
  const ballerinaCutoutB64 = getBase64('public/banner-assets/dancer-ballerina-cutout.png');
  const contemporaryCutoutB64 = getBase64('public/banner-assets/dancer-contemporary-cutout.png');
  const ballerinaBarreB64 = getBase64('public/banner-assets/dance-ballerina-lotus.jpg');
  const dynamicsB64 = getBase64('public/sparta_real_dynamics.jpg');
  const awardB64 = getBase64('public/sparta_real_award.jpg');
  const realQrB64 = getBase64('public/banner-assets/vk-qr-real.png');

  let htmlContent = fs.readFileSync(path.resolve(__dirname, '../public/banner-dance-lotus-soma.html'), 'utf-8');
  
  // Embed base64 images
  htmlContent = htmlContent.replace('/banner-assets/dance-silk-bg.jpg', silkBgB64);
  htmlContent = htmlContent.replace('/logo-gold.png', logoB64);
  htmlContent = htmlContent.replace('/banner-assets/dancer-ballerina-cutout.png', ballerinaCutoutB64);
  htmlContent = htmlContent.replace('/banner-assets/dancer-contemporary-cutout.png', contemporaryCutoutB64);
  htmlContent = htmlContent.replace('/banner-assets/dance-ballerina-lotus.jpg', ballerinaBarreB64);
  htmlContent = htmlContent.replace('/sparta_real_dynamics.jpg', dynamicsB64);
  htmlContent = htmlContent.replace('/sparta_real_award.jpg', awardB64);
  htmlContent = htmlContent.replace('/banner-assets/vk-qr-real.png', realQrB64);

  fs.writeFileSync(standaloneHtmlPath, htmlContent, 'utf-8');

  console.log('🚀 Launching Puppeteer for Cutout Dance Banner with Live Orbits (A4 • 300 DPI)...');

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

  console.log(`✅ Flawless Cutout Dance Banner with Orbits generated at: ${outputPdfPath}`);
  console.log(`✅ Flawless Cutout Dance Banner PNG generated at: ${outputPngPath}`);
}

exportDancePdfAndPng().catch(err => {
  console.error('❌ Dance PDF Export Error:', err);
  process.exit(1);
});
