import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureBanners() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 2600, height: 2400 },
    deviceScaleFactor: 2 // 2x retina crisp rendering
  });
  const page = await context.newPage();
  
  const htmlPath = path.resolve(__dirname, '../public/banners-view.html');
  console.log('Loading:', `file://${htmlPath}`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // ensure fonts & images render

  // 1. Capture Poster A4
  const posterElement = await page.$('#poster-a4');
  if (posterElement) {
    await posterElement.screenshot({
      path: path.resolve(__dirname, '../public/banner-assets/poster-a4-preview.png')
    });
    console.log('Captured poster-a4-preview.png');
  }

  // 2. Capture Rollup
  const rollupElement = await page.$('#rollup');
  if (rollupElement) {
    await rollupElement.screenshot({
      path: path.resolve(__dirname, '../public/banner-assets/rollup-preview.png')
    });
    console.log('Captured rollup-preview.png');
  }

  // 3. Full page overview
  await page.screenshot({
    path: path.resolve(__dirname, '../public/banner-assets/both-banners-overview.png'),
    fullPage: true
  });
  console.log('Captured both-banners-overview.png');

  await browser.close();
  console.log('All screenshots completed successfully!');
}

captureBanners().catch(console.error);
