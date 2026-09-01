import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

async function exportA4Posters() {
  console.log('🚀 Launching Puppeteer for Updated Non-Stretched A4 Posters (1240×1754 • 300 DPI Print-Ready)...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  // 1. FOOTBALL A4
  console.log('📄 Rendering Football A4...');
  const pageFb = await browser.newPage();
  await pageFb.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

  const fbHtmlPath = path.resolve(__dirname, '../public/sparta-football-a4.html');
  let fbHtml = fs.readFileSync(fbHtmlPath, 'utf8');
  fbHtml = fbHtml
    .replace('/banner-assets/sparta-football-a4-clean-bg.jpg', getBase64('public/banner-assets/sparta-football-a4-clean-bg.jpg'))
    .replace('/banner-assets/sparta-crest-gold.png', getBase64('public/banner-assets/sparta-crest-gold.png'))
    .replace('/banner-assets/icon-gift-nobg.png', getBase64('public/banner-assets/icon-gift-nobg.png'))
    .replace('/banner-assets/icon-ice-nobg.png', getBase64('public/banner-assets/icon-ice-nobg.png'))
    .replace('/banner-assets/icon-license-nobg.png', getBase64('public/banner-assets/icon-license-nobg.png'))
    .replace('/banner-assets/icon-nalogi-nobg.png', getBase64('public/banner-assets/icon-nalogi-nobg.png'));

  await pageFb.setContent(fbHtml, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const fbPdfPath = path.resolve(__dirname, '../public/sparta-football-a4-print-ready.pdf');
  const fbPngPath = path.resolve(__dirname, '../public/banner-assets/sparta-football-a4-poster.png');

  await pageFb.pdf({
    path: fbPdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  console.log('✅ Football A4 PDF exported: ' + fbPdfPath);

  await pageFb.screenshot({ path: fbPngPath, clip: { x: 0, y: 0, width: 1240, height: 1754 } });
  console.log('✅ Football A4 PNG exported: ' + fbPngPath);
  await pageFb.close();

  // 2. TENNIS A4
  console.log('📄 Rendering Tennis A4...');
  const pageTn = await browser.newPage();
  await pageTn.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

  const tnHtmlPath = path.resolve(__dirname, '../public/sparta-tennis-a4.html');
  let tnHtml = fs.readFileSync(tnHtmlPath, 'utf8');
  tnHtml = tnHtml
    .replace('/banner-assets/sparta-tennis-a4-clean-bg.jpg', getBase64('public/banner-assets/sparta-tennis-a4-clean-bg.jpg'))
    .replace('/banner-assets/sparta-crest-gold.png', getBase64('public/banner-assets/sparta-crest-gold.png'))
    .replace('/banner-assets/tennis-icon-gift.png', getBase64('public/banner-assets/tennis-icon-gift.png'))
    .replace('/banner-assets/tennis-icon-ice.png', getBase64('public/banner-assets/tennis-icon-ice.png'))
    .replace('/banner-assets/tennis-icon-license.png', getBase64('public/banner-assets/tennis-icon-license.png'))
    .replace('/banner-assets/tennis-icon-tax.png', getBase64('public/banner-assets/tennis-icon-tax.png'));

  await pageTn.setContent(tnHtml, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const tnPdfPath = path.resolve(__dirname, '../public/sparta-tennis-a4-print-ready.pdf');
  const tnPngPath = path.resolve(__dirname, '../public/banner-assets/sparta-tennis-a4-poster.png');

  await pageTn.pdf({
    path: tnPdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  console.log('✅ Tennis A4 PDF exported: ' + tnPdfPath);

  await pageTn.screenshot({ path: tnPngPath, clip: { x: 0, y: 0, width: 1240, height: 1754 } });
  console.log('✅ Tennis A4 PNG exported: ' + tnPngPath);
  await pageTn.close();

  await browser.close();
  console.log('🎉 Both A4 Posters (Football & Tennis) Export Complete!');
}

exportA4Posters().catch(err => {
  console.error('Error exporting A4 posters:', err);
  process.exit(1);
});
