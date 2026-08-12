const fs = require('fs');

const files = [
    'components/Dashboard.tsx',
    'components/profile/AttendanceSection.tsx',
    'components/profile/CoachSection.tsx',
    'pages/admin/AdminDashboard.tsx',
    'pages/admin/DirectorDashboard.tsx'
];

files.forEach(file => {
    console.log(`\n================================`);
    console.log(`FILE: ${file}`);
    console.log(`================================`);
    const code = fs.readFileSync(file, 'utf8');
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('attendance') || (line.includes('query(') && line.includes('groupId'))) {
            console.log(`L${idx+1}: ${line.trim()}`);
        }
    });
});
