import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureDanceBanner() {
  const htmlPath = path.resolve(__dirname, '../public/banner-dance-lotus-soma.html');
  const outputPath = path.resolve(__dirname, '../public/banner-assets/dance-lotus-soma-banner.png');

  console.log('🚀 Launching Puppeteer to capture LOTUS & SoMA dance banner...');

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

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 400));

  const bannerElement = await page.$('#dance-poster-frame');
  await bannerElement.screenshot({
    path: outputPath,
    type: 'png'
  });

  await browser.close();

  console.log(`✅ Captured LOTUS & SoMA Dance Banner at: ${outputPath}`);
}

captureDanceBanner().catch(err => {
  console.error('❌ Error capturing dance banner:', err);
  process.exit(1);
});
