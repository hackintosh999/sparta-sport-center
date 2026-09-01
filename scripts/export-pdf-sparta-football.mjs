import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportFootballPoster() {
  console.log('🚀 Launching Puppeteer for Final Sparta Football Poster (1012×2048 • 3D Icons Master)...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1012,
    height: 2048,
    deviceScaleFactor: 2
  });

  const htmlPath = path.resolve(__dirname, '../public/sparta-football-poster.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Inline images as Base64 for instant headless rendering
  function inlineImage(sourcePath) {
    const fullPath = path.resolve(__dirname, '../public', sourcePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).replace('.', '');
      const mime = ext === 'png' ? 'image/png' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:${mime};base64,${b64}`;
    }
    return sourcePath;
  }

  htmlContent = htmlContent.replace('/banner-assets/sparta-football-clean-bg.jpg', inlineImage('/banner-assets/sparta-football-clean-bg.jpg'));
  htmlContent = htmlContent.replace('/banner-assets/sparta-crest-gold.png', inlineImage('/banner-assets/sparta-crest-gold.png'));
  htmlContent = htmlContent.replace(/\/banner-assets\/icon-gift-nobg\.png/g, inlineImage('/banner-assets/icon-gift-nobg.png'));
  htmlContent = htmlContent.replace(/\/banner-assets\/icon-ice-nobg\.png/g, inlineImage('/banner-assets/icon-ice-nobg.png'));
  htmlContent = htmlContent.replace(/\/banner-assets\/icon-license-nobg\.png/g, inlineImage('/banner-assets/icon-license-nobg.png'));
  htmlContent = htmlContent.replace(/\/banner-assets\/icon-nalogi-nobg\.png/g, inlineImage('/banner-assets/icon-nalogi-nobg.png'));

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const pdfOutputs = [
    path.resolve(__dirname, '../public/banner-assets/sparta-football-poster.pdf'),
    path.resolve(__dirname, '../public/sparta-football-print-ready.pdf')
  ];

  for (const p of pdfOutputs) {
    await page.pdf({
      path: p,
      width: '1012px',
      height: '2048px',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    console.log('✅ Final Sparta Football Poster PDF generated at: ' + p);
  }

  const pngOutputs = [
    path.resolve(__dirname, '../public/banner-assets/sparta-football-poster.png'),
    path.resolve(__dirname, '../public/sparta-football-poster.png')
  ];

  for (const p of pngOutputs) {
    await page.screenshot({
      path: p,
      type: 'png',
      fullPage: true
    });
    console.log('✅ Final Sparta Football Poster PNG generated at: ' + p);
  }

  await browser.close();
  console.log('🎉 Final Sparta Football Masterpiece Export Complete!');
}

exportFootballPoster().catch(err => {
  console.error('Export Error:', err);
  process.exit(1);
});
