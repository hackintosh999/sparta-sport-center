const fs = require('fs');
const path = require('path');

function searchAttendance(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            searchAttendance(full);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            const code = fs.readFileSync(full, 'utf8');
            if (code.includes("collection(db, 'attendance')") || code.includes('collection(db, "attendance")')) {
                console.log(`Found attendance query in: ${full}`);
                const lines = code.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('attendance') && (line.includes('orderBy') || line.includes('query') || line.includes('where'))) {
                        console.log(`  L${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

searchAttendance(path.join(__dirname, '..', 'components'));
searchAttendance(path.join(__dirname, '..', 'pages'));
