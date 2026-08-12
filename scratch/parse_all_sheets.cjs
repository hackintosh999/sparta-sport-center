const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const file1 = path.join(__dirname, '..', 'список групп 1 - 2026.xlsx');
const file2 = path.join(__dirname, '..', 'список групп на 2- 2026.xlsx');

console.log('====================================================');
console.log('FILE 1: список групп 1 - 2026.xlsx');
console.log('====================================================');

const wb1 = xlsx.readFile(file1);
wb1.SheetNames.forEach(name => {
    const sheet = wb1.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const students = rows.filter(r => Array.isArray(r) && typeof r[0] === 'number' && r[1]);
    console.log(`Sheet "${name}": Total Students = ${students.length}`);
});

console.log('\n====================================================');
console.log('FILE 2: список групп на 2- 2026.xlsx');
console.log('====================================================');

const wb2 = xlsx.readFile(file2);
wb2.SheetNames.forEach(name => {
    const sheet = wb2.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const students = rows.filter(r => Array.isArray(r) && typeof r[0] === 'number' && r[1]);
    console.log(`Sheet "${name}": Total Students = ${students.length}`);
});
