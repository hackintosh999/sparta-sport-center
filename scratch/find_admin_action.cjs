const fs = require('fs');
const path = require('path');

const adminUsersFile = path.join(__dirname, '..', 'pages', 'admin', 'AdminUsers.tsx');
const content = fs.readFileSync(adminUsersFile, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('handleEdit') || line.includes('openEdit') || line.includes('ActiveDropdown') || line.includes('dropdown')) {
        console.log(`L${idx+1}: ${line.trim()}`);
    }
});
