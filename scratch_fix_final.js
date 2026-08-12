import fs from 'fs';
import parser from '@babel/parser';

let code = fs.readFileSync('components/LandingPage.tsx', 'utf8');

// Remove corrupt lines between Team and Footer in LandingPage
code = code.replace(/\}\)\)\;\r?\n\s*<\/div>\r?\n\s*<\/Container>\r?\n\s*<\/section>\r?\n\s*\}\;\r?\n/g, '');

// Find the first export default LandingPage;
const expStr = 'export default LandingPage;';
const idx = code.indexOf(expStr);

if (idx >= 0) {
    code = code.substring(0, idx + expStr.length) + '\n';
}

try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    fs.writeFileSync('components/LandingPage.tsx', code, 'utf8');
    console.log('SUCCESS: LandingPage.tsx 100% clean and valid!');
} catch (e) {
    console.error('Parse error:', e.message);
}
