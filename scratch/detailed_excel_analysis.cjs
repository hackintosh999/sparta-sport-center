const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const file1 = path.join(__dirname, '..', 'список групп 1 - 2026.xlsx');
const file2 = path.join(__dirname, '..', 'список групп на 2- 2026.xlsx');

function analyzeFile(filePath, fileName) {
    console.log(`\n=======================================================`);
    console.log(`FILE: ${fileName}`);
    console.log(`=======================================================`);
    
    const wb = xlsx.readFile(filePath);
    wb.SheetNames.forEach(sheetName => {
        console.log(`\n-------------------------------------------------------`);
        console.log(`📋 SHEET: "${sheetName}"`);
        console.log(`-------------------------------------------------------`);
        
        const sheet = wb.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // Print first 5 rows to see headers/group info
        console.log("Header Info:");
        rows.slice(0, 4).forEach((r, idx) => {
            if (r && r.length) console.log(`  Row ${idx+1}:`, r.join(' | '));
        });
        
        const students = rows.filter(r => Array.isArray(r) && typeof r[0] === 'number' && r[1]);
        console.log(`Total Enrolled Students: ${students.length}`);
        console.log("Sample Students:");
        students.slice(0, 5).forEach(s => {
            console.log(`  - #${s[0]}: ${s[1]} (Родитель: ${s[3] || 'н/д'}, Тел: ${s[2] || 'н/д'})`);
        });
    });
}

analyzeFile(file1, 'список групп 1 - 2026.xlsx');
analyzeFile(file2, 'список групп на 2- 2026.xlsx');
