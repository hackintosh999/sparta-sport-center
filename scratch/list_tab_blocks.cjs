const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

for (let i = 3335; i < 3770; i++) {
    if (lines[i].includes('activeTab ===')) {
        console.log(`L${i+1}: ${lines[i].trim()}`);
    }
}
