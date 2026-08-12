const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

for (let i = 2450; i < 2700; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
}
