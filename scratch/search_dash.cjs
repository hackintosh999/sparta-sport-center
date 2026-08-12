const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
if (fs.existsSync(dashFile)) {
    const content = fs.readFileSync(dashFile, 'utf8');
    const matches = content.match(/.*(cancel|freeze|отмен|замороз|schedule|тренировк|абонемент).*/gi);
    console.log(`Found ${matches ? matches.length : 0} matching lines in Dashboard.tsx`);
    if (matches) {
        matches.slice(0, 15).forEach(m => console.log(' ->', m.trim()));
    }
}
