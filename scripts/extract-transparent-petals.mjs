import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processPetals() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/User/.gemini/antigravity/brain/117ffb21-6064-4b40-ba72-d00f83a0121e/.user_uploaded/media_1787075492319.png';
  const imgB64 = fs.readFileSync(sourceImagePath).toString('base64');
  const dataUrl = `data:image/png;base64,${imgB64}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas"></canvas>
      <script>
        window.processImage = function(src) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.getElementById('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgData.data;

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Whiteness metric
                const minVal = Math.min(r, g, b);
                const maxVal = Math.max(r, g, b);
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

                // Exact background removal: if pure white -> 0 alpha, darker petal shadows -> high alpha
                let alpha = 255 - minVal;
                
                // Enhance petal body opacity while keeping background 100% transparent
                if (minVal > 250) {
                  alpha = 0;
                } else {
                  // Gentle S-curve boost for petal solidity and gold/cream richness
                  alpha = Math.min(255, Math.pow(alpha / 255, 0.75) * 280);
                }

                data[i + 3] = Math.round(alpha);
                
                // Color boost for warm golden-cream petals
                data[i] = Math.min(255, Math.round(r * 1.05));
                data[i + 1] = Math.min(255, Math.round(g * 0.98));
                data[i + 2] = Math.min(255, Math.round(b * 0.92));
              }

              ctx.putImageData(imgData, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            };
            img.src = src;
          });
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  const resultDataUrl = await page.evaluate((url) => window.processImage(url), dataUrl);
  await browser.close();

  const base64Data = resultDataUrl.replace(/^data:image\/png;base64,/, "");
  const outPath = path.resolve(__dirname, '../public/banner-assets/lotus-petals-transparent.png');
  fs.writeFileSync(outPath, base64Data, 'base64');
  console.log('✅ Successfully extracted transparent 3D lotus petals PNG at:', outPath);
}

processPetals().catch(console.error);
