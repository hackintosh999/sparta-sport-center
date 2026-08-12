const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('user.email') || line.includes('userProfile?.email') || line.includes('userProfile.email') || line.includes('email')) {
        if (line.includes('text-white') || line.includes('text-') || line.includes('p') || line.includes('span')) {
            console.log(`L${idx+1}: ${line.trim()}`);
        }
    }
});
