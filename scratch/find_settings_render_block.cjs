const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

for (let i = 2350; i < 2750; i++) {
    if (lines[i].includes('activeTab') || lines[i].includes('settings') || lines[i].includes('profile') || lines[i].includes('return') || lines[i].includes('motion.div')) {
        console.log(`L${i+1}: ${lines[i].trim()}`);
    }
}
