import puppeteer from 'puppeteer';
import path from 'path';

async function renderPdf() {
  console.log('Launching Puppeteer to render Sparta Main Block Presentation PDF...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  const htmlPath = path.resolve('scratch/sparta_presentation.html');
  await page.goto(`file:///${htmlPath}`, { waitUntil: 'networkidle0' });

  const pdfPath = path.resolve('sparta_main_hero_presentation.pdf');
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  console.log(`Rendered PDF presentation successfully to: ${pdfPath}`);
}

renderPdf().catch(err => {
  console.error('Error rendering PDF:', err);
  process.exit(1);
});
