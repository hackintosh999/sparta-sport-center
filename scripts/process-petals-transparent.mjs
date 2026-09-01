import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractAlphaPetals() {
  const inputPath = path.resolve(__dirname, '../public/banner-assets/lotus-petals-real-3d.png');
  const outputPath = path.resolve(__dirname, '../public/banner-assets/lotus-petals-transparent.png');

  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    return;
  }

  const imgBase64 = fs.readFileSync(inputPath).toString('base64');

  const html = `
  <!DOCTYPE html>
  <html>
  <body>
    <canvas id="c"></canvas>
    <script>
      const img = new Image();
      img.src = "data:image/png;base64,${imgBase64}";
      img.onload = () => {
        const canvas = document.getElementById('c');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];

          // Calculate distance from pure white (255, 255, 255)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          
          if (brightness >= 253) {
            data[i+3] = 0; // completely transparent background
          } else {
            // Smooth transparency transition
            const alpha = Math.min(255, Math.max(0, Math.pow((255 - brightness) / 255, 0.75) * 255 * 1.8));
            data[i+3] = Math.round(alpha);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        window.done = true;
      };
    </script>
  </body>
  </html>
  `;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html);
  await page.waitForFunction(() => window.done === true);

  const canvasHandle = await page.$('#c');
  const base64Data = await page.evaluate(() => {
    return document.getElementById('c').toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  });

  fs.writeFileSync(outputPath, base64Data, 'base64');
  await browser.close();
  console.log('✅ Transparent 3D Lotus Petals extracted to:', outputPath);
}

extractAlphaPetals();
