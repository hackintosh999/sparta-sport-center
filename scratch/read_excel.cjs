const fs = require('fs');
const path = require('path');

async function readExcelFiles() {
    try {
        let xlsx;
        try {
            xlsx = require('xlsx');
        } catch (e) {
            console.log('xlsx module not found in node_modules');
            return;
        }

        const file1 = path.join(__dirname, '..', 'список групп 1 - 2026.xlsx');
        const file2 = path.join(__dirname, '..', 'список групп на 2- 2026.xlsx');

        if (fs.existsSync(file1)) {
            console.log('=== READING FILE 1: список групп 1 - 2026.xlsx ===');
            const wb1 = xlsx.readFile(file1);
            wb1.SheetNames.forEach(sheetName => {
                console.log(`--- SHEET: ${sheetName} ---`);
                const data = xlsx.utils.sheet_to_json(wb1.Sheets[sheetName], { header: 1 });
                console.log(JSON.stringify(data, null, 2));
            });
        }

        if (fs.existsSync(file2)) {
            console.log('=== READING FILE 2: список групп на 2- 2026.xlsx ===');
            const wb2 = xlsx.readFile(file2);
            wb2.SheetNames.forEach(sheetName => {
                console.log(`--- SHEET: ${sheetName} ---`);
                const data = xlsx.utils.sheet_to_json(wb2.Sheets[sheetName], { header: 1 });
                console.log(JSON.stringify(data, null, 2));
            });
        }
    } catch (err) {
        console.error('Error reading excel files:', err);
    }
}

readExcelFiles();
