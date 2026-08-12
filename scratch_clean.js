import fs from 'fs';
import parser from '@babel/parser';

let code = fs.readFileSync('components/LandingPage.tsx', 'utf8');

// Find all occurrences of export default LandingPage;
const expStr = 'export default LandingPage;';
const idx = code.indexOf(expStr);

if (idx >= 0) {
    code = code.substring(0, idx + expStr.length) + '\n';
}

// Remove the orphan line 862 if present
code = code.replace(/\n\s*\}\)\)\;\s*\n\s*<\/div>\s*\n\s*<\/Container>\s*\n\s*<\/section>\s*\n\s*\}\;\s*\n/g, '\n');

try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    fs.writeFileSync('components/LandingPage.tsx', code, 'utf8');
    console.log('CLEAN PARSE SUCCESSFUL!');
} catch (e) {
    console.error('Parse error:', e.message);
}
