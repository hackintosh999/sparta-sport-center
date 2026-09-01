import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateQR() {
  const url = 'https://vk.ru/sparta_fk';
  const outPng = path.resolve(__dirname, '../public/banner-assets/vk-qr-real.png');
  const outSvg = path.resolve(__dirname, '../public/banner-assets/vk-qr-real.svg');

  await QRCode.toFile(outPng, url, {
    width: 600,
    margin: 1,
    color: {
      dark: '#050D15',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  await QRCode.toFile(outSvg, url, {
    margin: 1,
    color: {
      dark: '#050D15',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });

  console.log('✅ Generated real scannable QR codes for:', url);
}

generateQR().catch(console.error);
