const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, '..', 'components', 'Dashboard.tsx');
const content = fs.readFileSync(dashFile, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('Пользователи') || line.includes('пользовател') || line.includes('searchUser') || line.includes('allUsers') || line.includes('usersList')) {
        console.log(`L${idx+1}: ${line.trim()}`);
    }
});
