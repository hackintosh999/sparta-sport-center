const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            searchFiles(full);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            const code = fs.readFileSync(full, 'utf8');
            if (code.includes('ParentDashboard')) {
                console.log(`Found ParentDashboard in: ${full}`);
            }
        }
    }
}

searchFiles(path.join(__dirname, '..', 'components'));
