const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.claude-flow' || file === 'ruvector.db') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchDir(fullPath, pattern);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.json') || file.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (pattern.test(content)) {
                console.log(`Found match in: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (pattern.test(line)) {
                        console.log(`  Line ${idx + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

const rootDir = path.resolve(__dirname, '..');
console.log('Searching for nfisah / arabic name...');
searchDir(rootDir, /nfisah|نفيسه|Молодой Атлет/i);
