import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBase64(relPath) {
  const full = path.resolve(__dirname, '..', relPath.replace(/^\//, ''));
  if (fs.existsSync(full)) {
    const ext = path.extname(full).toLowerCase().replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
    const data = fs.readFileSync(full).toString('base64');
    return `data:${mime};base64,${data}`;
  }
  return '';
}

async function exportDuoRollup() {
  console.log('🚀 Launching Puppeteer for Combined Duo Rollup (100x200cm • 1012x2048)...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1012, height: 2048, deviceScaleFactor: 2 });

  const htmlPath = path.resolve(__dirname, '../public/sparta-duo-rollup-master.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Inline all assets
  const assets = [
    'sparta-tennis-girl-clean-bg.jpg',
    'sparta-football-clean-bg.jpg',
    'sparta-crest-gold.png',
    'icon-gift-nobg.png',
    'icon-ice-nobg.png',
    'tennis-icon-license.png',
    'tennis-icon-tax.png'
  ];

  for (const asset of assets) {
    const b64 = getBase64(`public/banner-assets/${asset}`);
    if (b64) {
      html = html.replaceAll(`/banner-assets/${asset}`, b64);
      html = html.replaceAll(`banner-assets/${asset}`, b64);
    }
  }

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const pdfOutputs = [
    path.resolve(__dirname, '../public/sparta-duo-rollup-print-ready.pdf'),
    path.resolve(__dirname, '../public/banner-assets/sparta-duo-rollup.pdf')
  ];

  for (const p of pdfOutputs) {
    await page.pdf({
      path: p,
      width: '1012px',
      height: '2048px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log('✅ Duo Rollup PDF saved to: ' + p);
  }

  const pngOutputs = [
    path.resolve(__dirname, '../public/banner-assets/sparta-duo-rollup.png'),
    path.resolve(__dirname, '../public/sparta-duo-rollup.png')
  ];

  for (const p of pngOutputs) {
    await page.screenshot({ path: p, clip: { x: 0, y: 0, width: 1012, height: 2048 } });
    console.log('✅ Duo Rollup PNG saved to: ' + p);
  }

  await browser.close();
  console.log('🎉 Combined Sparta Duo Rollup 100x200cm Export Complete!');
}

exportDuoRollup().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
