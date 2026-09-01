import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace banner-summer-camp-style.html with standalone embedded base64 version so opening in browser/Figma/Chrome always loads 100% of images
const standaloneSrc = fs.readFileSync(path.resolve(__dirname, '../public/banner-print-standalone.html'), 'utf-8');
fs.writeFileSync(path.resolve(__dirname, '../public/banner-summer-camp-style.html'), standaloneSrc, 'utf-8');
console.log('✅ Synchronized banner-summer-camp-style.html with 100% standalone base64 resources!');
