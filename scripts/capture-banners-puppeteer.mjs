import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({
    width: 2600,
    height: 2400,
    deviceScaleFactor: 2
  });

  const htmlPath = path.resolve(__dirname, '../public/banners-view.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Poster A4
  const poster = await page.$('#poster-a4');
  if (poster) {
    await poster.screenshot({
      path: path.resolve(__dirname, '../public/banner-assets/poster-a4-result.png')
    });
    console.log('✅ Poster A4 captured: public/banner-assets/poster-a4-result.png');
  }

  // 2. Rollup
  const rollup = await page.$('#rollup');
  if (rollup) {
    await rollup.screenshot({
      path: path.resolve(__dirname, '../public/banner-assets/rollup-result.png')
    });
    console.log('✅ Rollup captured: public/banner-assets/rollup-result.png');
  }

  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
