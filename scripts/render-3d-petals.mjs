import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function render3DPetals() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 2048px;
      height: 2048px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 2048px;
      height: 2048px;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 2048 2048" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- 3D Lighting & Shading for Petal 1 -->
      <linearGradient id="p1Body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="35%" stop-color="#FCF6EB"/>
        <stop offset="70%" stop-color="#F3E4CA"/>
        <stop offset="100%" stop-color="#E2CCA6"/>
      </linearGradient>

      <linearGradient id="p1PinkTip" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#F2AFAF" stop-opacity="0.9"/>
        <stop offset="30%" stop-color="#F8D3D3" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>

      <radialGradient id="p1Highlight" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="50%" stop-color="#FFFDF8" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#EAD5B5" stop-opacity="0"/>
      </radialGradient>

      <!-- 3D Lighting for Petal 2 (Curled) -->
      <linearGradient id="p2Body" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="40%" stop-color="#F9F1E2"/>
        <stop offset="80%" stop-color="#EBD8B8"/>
        <stop offset="100%" stop-color="#D4BA90"/>
      </linearGradient>

      <linearGradient id="p2PinkTip" x1="70%" y1="0%" x2="30%" y2="100%">
        <stop offset="0%" stop-color="#EE9E9E" stop-opacity="0.95"/>
        <stop offset="25%" stop-color="#F5C4C4" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>

      <radialGradient id="p2VeinShade" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFDF9" stop-opacity="0"/>
        <stop offset="80%" stop-color="#CBB187" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#B29465" stop-opacity="0.6"/>
      </radialGradient>

      <!-- Shadow filter -->
      <filter id="soft3DShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="25" stdDeviation="25" flood-color="#000000" flood-opacity="0.18"/>
      </filter>
    </defs>

    <!-- PETAL 1: Large Broad Lotus Petal (Top-Left) -->
    <g transform="translate(480, 520) rotate(-15)" filter="url(#soft3DShadow)">
      <path d="M 0,-380 C 220,-240 320,120 180,380 C 60,420 -60,420 -180,380 C -320,120 -220,-240 0,-380 Z" fill="url(#p1Body)"/>
      <path d="M 0,-380 C 220,-240 320,120 180,380 C 60,420 -60,420 -180,380 C -320,120 -220,-240 0,-380 Z" fill="url(#p1PinkTip)"/>
      <path d="M -40,-350 C 140,-220 220,80 120,320 C 20,360 -60,360 -140,320 C -220,80 -140,-220 -40,-350 Z" fill="url(#p1Highlight)"/>
      <path d="M 0,-370 Q 15,0 0,390" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.6" fill="none"/>
      <path d="M -60,-150 Q 0,-50 60,-150" stroke="#FFFFFF" stroke-width="2" opacity="0.35" fill="none"/>
      <path d="M -90,40 Q 0,120 90,40" stroke="#FFFFFF" stroke-width="2" opacity="0.35" fill="none"/>
    </g>

    <!-- PETAL 2: Elegant Curved / Flying Lotus Petal (Top-Right) -->
    <g transform="translate(1500, 580) rotate(35)" filter="url(#soft3DShadow)">
      <path d="M -60,-420 C 180,-300 280,40 140,360 C 20,410 -100,380 -180,260 C -260,80 -240,-260 -60,-420 Z" fill="url(#p2Body)"/>
      <path d="M -60,-420 C 180,-300 280,40 140,360 C 20,410 -100,380 -180,260 C -260,80 -240,-260 -60,-420 Z" fill="url(#p2PinkTip)"/>
      <path d="M -60,-420 C 180,-300 280,40 140,360 C 20,410 -100,380 -180,260 C -260,80 -240,-260 -60,-420 Z" fill="url(#p2VeinShade)"/>
      <path d="M -55,-410 Q 30,0 -40,350" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" opacity="0.75" fill="none"/>
      <path d="M -140,-120 Q -40,-20 80,-80" stroke="#FFFFFF" stroke-width="2" opacity="0.4" fill="none"/>
      <path d="M -160,80 Q -60,160 60,110" stroke="#FFFFFF" stroke-width="2" opacity="0.4" fill="none"/>
    </g>

    <!-- PETAL 3: Delicate Floating Foreground Petal (Bottom-Center) -->
    <g transform="translate(1020, 1450) rotate(-40)" filter="url(#soft3DShadow)">
      <path d="M 0,-340 C 180,-200 240,100 120,320 C 30,360 -50,360 -130,310 C -220,100 -160,-200 0,-340 Z" fill="url(#p1Body)"/>
      <path d="M 0,-340 C 180,-200 240,100 120,320 C 30,360 -50,360 -130,310 C -220,100 -160,-200 0,-340 Z" fill="url(#p1PinkTip)"/>
      <path d="M 0,-340 C 180,-200 240,100 120,320 C 30,360 -50,360 -130,310 C -220,100 -160,-200 0,-340 Z" fill="url(#p1Highlight)"/>
      <path d="M 0,-330 Q 10,0 0,330" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" opacity="0.6" fill="none"/>
    </g>
  </svg>
</body>
</html>`;

  const tempHtmlPath = path.resolve('public/temp-3d-petals.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 2048, height: 2048, deviceScaleFactor: 1 });
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'load' });

  const downloadPath = 'C:\\Users\\User\\Downloads\\lotus-petals-3d-render.png';
  const localPath = path.resolve('public/banner-assets/lotus-petals-3d-render.png');

  await page.screenshot({ path: downloadPath, type: 'png' });
  await page.screenshot({ path: localPath, type: 'png' });

  await browser.close();
  if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

  console.log(`✅ Successfully saved 3D Lotus Petals to: ${downloadPath}`);
}

render3DPetals();
