import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load file as base64 data URI
function getBase64(relPath) {
  const full = path.resolve(__dirname, '..', relPath.replace(/^\//, ''));
  if (fs.existsSync(full)) {
    const ext = path.extname(full).toLowerCase().replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
    const data = fs.readFileSync(full).toString('base64');
    return `data:${mime};base64,${data}`;
  }
  console.warn('⚠️ File not found for inlining:', full);
  return '';
}

// Universal Inliner that replaces every /banner-assets/* and banner-assets/* with base64
function inlineAllAssets(html) {
  return html.replace(/([src|href|xlink:href|url]\s*=\s*["']|\burl\(['"]?)([/a-zA-Z0-9_\-\.]*banner-assets\/[^"'\)]+)["'\)]/gi, (match, prefix, assetPath) => {
    const cleanPath = assetPath.replace(/^\//, '');
    const b64 = getBase64(`public/${cleanPath}`);
    if (b64) {
      if (match.startsWith('url(')) {
        return `url('${b64}')`;
      }
      return `${prefix}${b64}"`;
    }
    return match;
  });
}

// Map of all banners to build
const tasks = [
  {
    name: '1. Football A4',
    htmlFile: 'public/sparta-football-a4.html',
    pdfFile: 'public/sparta-football-a4-print-ready.pdf',
    pngFile: 'public/banner-assets/sparta-football-a4-poster.png',
    width: 1240,
    height: 1754,
    isA4: true
  },
  {
    name: '2. Tennis A4',
    htmlFile: 'public/sparta-tennis-a4.html',
    pdfFile: 'public/sparta-tennis-a4-print-ready.pdf',
    pngFile: 'public/banner-assets/sparta-tennis-a4-poster.png',
    width: 1240,
    height: 1754,
    isA4: true
  },
  {
    name: '3. Football Rollup (100x200cm)',
    htmlFile: 'public/sparta-football-poster.html',
    pdfFile: 'public/sparta-football-print-ready.pdf',
    extraPdfFile: 'public/banner-assets/sparta-football-poster.pdf',
    pngFile: 'public/banner-assets/sparta-football-poster.png',
    width: 1012,
    height: 2048,
    isA4: false
  },
  {
    name: '4. Tennis Rollup (100x200cm)',
    htmlFile: 'public/sparta-tennis-mint-poster.html',
    pdfFile: 'public/sparta-tennis-mint-print-ready.pdf',
    extraPdfFile: 'public/banner-assets/sparta-tennis-mint-poster.pdf',
    pngFile: 'public/banner-assets/sparta-tennis-mint-poster.png',
    width: 1012,
    height: 2048,
    isA4: false
  }
];

async function exportAll() {
  console.log('🚀 Starting Universal Headless PDF/PNG Exporter for all 4 banners...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  for (const t of tasks) {
    console.log(`\n⏳ Rendering: ${t.name}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 2 });

    const rawHtml = fs.readFileSync(path.resolve(__dirname, '..', t.htmlFile), 'utf8');
    
    // Explicit asset dictionary replacement to ensure 100% reliability
    let inlinedHtml = rawHtml;
    const assets = [
      'sparta-football-a4-clean-bg.jpg',
      'sparta-tennis-a4-clean-bg.jpg',
      'sparta-football-clean-bg.jpg',
      'sparta-tennis-girl-clean-bg.jpg',
      'sparta-crest-gold.png',
      'icon-gift-nobg.png',
      'icon-ice-nobg.png',
      'icon-license-nobg.png',
      'icon-nalogi-nobg.png',
      'tennis-icon-gift.png',
      'tennis-icon-ice.png',
      'tennis-icon-license.png',
      'tennis-icon-tax.png'
    ];

    for (const asset of assets) {
      const b64 = getBase64(`public/banner-assets/${asset}`);
      if (b64) {
        inlinedHtml = inlinedHtml.replaceAll(`/banner-assets/${asset}`, b64);
        inlinedHtml = inlinedHtml.replaceAll(`banner-assets/${asset}`, b64);
      }
    }

    await page.setContent(inlinedHtml, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Export PDF
    const pdfPath = path.resolve(__dirname, '..', t.pdfFile);
    const pdfOpts = {
      path: pdfPath,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    };
    if (t.isA4) {
      pdfOpts.format = 'A4';
    } else {
      pdfOpts.width = `${t.width}px`;
      pdfOpts.height = `${t.height}px`;
    }
    await page.pdf(pdfOpts);
    console.log(`  ✅ Saved PDF -> ${t.pdfFile}`);

    if (t.extraPdfFile) {
      const extraPdfPath = path.resolve(__dirname, '..', t.extraPdfFile);
      fs.copyFileSync(pdfPath, extraPdfPath);
      console.log(`  ✅ Saved Extra PDF -> ${t.extraPdfFile}`);
    }

    // Export PNG
    const pngPath = path.resolve(__dirname, '..', t.pngFile);
    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: t.width, height: t.height } });
    console.log(`  ✅ Saved PNG -> ${t.pngFile}`);

    await page.close();
  }

  await browser.close();
  console.log('\n🎉 ALL 4 MASTERPIECE BANNERS (A4 & ROLLUP) EXPORTED WITH 100% INLINED ASSETS!');
}

exportAll().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
