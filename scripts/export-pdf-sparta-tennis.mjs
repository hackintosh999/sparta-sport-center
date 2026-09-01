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

async function exportSpartaTennisPoster() {
  const outputPdfPath = path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster.pdf');
  const outputPngPath = path.resolve(__dirname, '../public/banner-assets/sparta-tennis-poster.png');
  const printReadyPdfPath = path.resolve(__dirname, '../public/sparta-tennis-print-ready.pdf');
  const standaloneHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-standalone.html');

  const bgPhotoB64 = getBase64('public/banner-assets/sparta-tennis-sunny-bg.png');
  const crestB64 = getBase64('public/banner-assets/sparta-crest-gold.png');

  let htmlContent = fs.readFileSync(path.resolve(__dirname, '../public/sparta-tennis-editorial-poster.html'), 'utf-8');
  
  // Embed base64 images so headless Chromium loads everything instantly via file://
  htmlContent = htmlContent.replace('/banner-assets/sparta-tennis-sunny-bg.png', bgPhotoB64);
  htmlContent = htmlContent.replace('/banner-assets/sparta-crest-gold.png', crestB64);

  fs.writeFileSync(standaloneHtmlPath, htmlContent, 'utf-8');

  console.log('🚀 Launching Puppeteer for Sunny Sparta Tennis Poster (A4 • 1240×1754 • 300 DPI)...');

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

  console.log(`✅ Flawless Sunny Sparta Tennis Poster PDF generated at: ${outputPdfPath}`);
  console.log(`✅ Flawless Sunny Sparta Tennis Poster PNG generated at: ${outputPngPath}`);
}

exportSpartaTennisPoster().catch(err => {
  console.error('❌ Sparta Poster Export Error:', err);
  process.exit(1);
});
