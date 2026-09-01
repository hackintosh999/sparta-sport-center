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
    width: 1600,
    height: 2200,
    deviceScaleFactor: 2
  });

  const htmlPath = path.resolve(__dirname, '../public/banner-pinterest-style.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const poster = await page.$('#poster-pinterest');
  if (poster) {
    const outPath = path.resolve(__dirname, '../public/banner-assets/sparta-pinterest-banner.png');
    await poster.screenshot({ path: outPath });
    console.log('✅ Captured:', outPath);
  }

  await browser.close();
}

capture().catch(console.error);
