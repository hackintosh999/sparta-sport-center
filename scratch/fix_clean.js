import fs from 'fs';
import parser from '@babel/parser';

const code = fs.readFileSync('components/LandingPage.tsx', 'utf8');
const lines = code.split(/\r?\n/);

// Keep lines 1 to 672 (0-indexed 0 to 672)
const part1 = lines.slice(0, 672).join('\n');
// Keep lines 869 to end (0-indexed 868 to end)
const part2 = lines.slice(868).join('\n');

const cleanCode = part1 + '\n\n' + part2;

try {
    parser.parse(cleanCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    fs.writeFileSync('components/LandingPage.tsx', cleanCode, 'utf8');
    console.log('SUCCESS: LandingPage.tsx clean recovery complete!');
} catch (e) {
    console.error('Parse error:', e.message);
}
