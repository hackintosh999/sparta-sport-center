const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('ParentDashboard') || line.includes('activeTab === \'family\'')) {
        console.log(`L${idx+1}: ${line.trim()}`);
    }
});
