import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

test('capture banner screenshots', async ({ page }) => {
  const htmlPath = path.resolve(process.cwd(), 'public/banners-view.html');
  await page.setViewportSize({ width: 2600, height: 2400 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const posterElement = await page.$('#poster-a4');
  if (posterElement) {
    await posterElement.screenshot({
      path: path.resolve(process.cwd(), 'public/banner-assets/poster-a4-preview.png')
    });
  }

  const rollupElement = await page.$('#rollup');
  if (rollupElement) {
    await rollupElement.screenshot({
      path: path.resolve(process.cwd(), 'public/banner-assets/rollup-preview.png')
    });
  }
});
