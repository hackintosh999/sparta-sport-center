const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            if (f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== 'build') {
                searchDir(full);
            }
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            const code = fs.readFileSync(full, 'utf8');
            if (code.includes('Настройки') || code.includes('settings')) {
                const lines = code.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('Настройки') || (line.includes('settings') && line.includes('onClick'))) {
                        console.log(`${full} L${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

searchDir(path.join(__dirname, '..', 'components'));
searchDir(path.join(__dirname, '..', 'pages'));
