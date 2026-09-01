import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBase64(fullPath) {
  if (fs.existsSync(fullPath)) {
    const data = fs.readFileSync(fullPath).toString('base64');
    return `data:image/jpeg;base64,${data}`;
  }
  return '';
}

async function slice3dIcons() {
  const lotusSheetPath = 'C:/Users/User/.gemini/antigravity/brain/117ffb21-6064-4b40-ba72-d00f83a0121e/icon_3d_lotus_icons_1787060419084.jpg';
  const somaSheetPath = 'C:/Users/User/.gemini/antigravity/brain/117ffb21-6064-4b40-ba72-d00f83a0121e/icon_3d_soma_icons_1787060450868.jpg';

  const lotusB64 = getBase64(lotusSheetPath);
  const somaB64 = getBase64(somaSheetPath);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Crop Lotus Icons (1024x1024)
  // Ballet Shoes (top-left: 0, 0, 512, 512)
  // Lotus Stretch (top-right: 512, 0, 512, 512)
  // Music Rhythm (bottom-right: 512, 512, 512, 512)

  const crops = [
    {
      name: 'icon-3d-ballet.png',
      src: lotusB64,
      sx: 30, sy: 30, sw: 460, sh: 460
    },
    {
      name: 'icon-3d-stretch.png',
      src: lotusB64,
      sx: 530, sy: 30, sw: 460, sh: 460
    },
    {
      name: 'icon-3d-rhythm.png',
      src: lotusB64,
      sx: 530, sy: 530, sw: 460, sh: 460
    },
    {
      name: 'icon-3d-lightning.png',
      src: somaB64,
      sx: 50, sy: 50, sw: 440, sh: 440
    },
    {
      name: 'icon-3d-sneaker.png',
      src: somaB64,
      sx: 530, sy: 50, sw: 440, sh: 440
    },
    {
      name: 'icon-3d-trophy.png',
      src: somaB64,
      sx: 330, sy: 530, sw: 440, sh: 440
    }
  ];

  for (const crop of crops) {
    const html = `
      <html>
        <body style="margin:0; padding:0; background:transparent; overflow:hidden;">
          <canvas id="c" width="${crop.sw}" height="${crop.sh}"></canvas>
          <script>
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, ${crop.sx}, ${crop.sy}, ${crop.sw}, ${crop.sh}, 0, 0, ${crop.sw}, ${crop.sh});
              window.done = true;
            };
            img.src = "${crop.src}";
          </script>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForFunction('window.done === true');

    const canvasEl = await page.$('#c');
    const destPath = path.resolve(__dirname, '../public/banner-assets', crop.name);
    await canvasEl.screenshot({ path: destPath, omitBackground: true });
    console.log(`✅ Saved 3D icon: ${destPath}`);
  }

  await browser.close();
}

slice3dIcons().catch(console.error);
