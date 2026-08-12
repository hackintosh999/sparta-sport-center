const fs = require('fs');
const path = require('path');

function inspectFile(filePath, label) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`\n=======================================================`);
    console.log(`FILE: ${label} (${filePath})`);
    console.log(`=======================================================`);

    // Find tab definitions, buttons, features
    const tabs = content.match(/activeTab === '([^']+)'/g) || [];
    const uniqueTabs = [...new Set(tabs.map(t => t.replace("activeTab === '", "").replace("'", "")))];
    console.log('Unique Tabs found:', uniqueTabs);

    const buttons = content.match(/<button[^>]*>([\s\S]*?)<\/button>/g) || [];
    console.log(`Total buttons found: ${buttons.length}`);
}

inspectFile(path.join(__dirname, '..', 'components', 'Dashboard.tsx'), 'Dashboard.tsx (Parent/Main)');
inspectFile(path.join(__dirname, '..', 'components', 'dashboard', 'KidDashboard.tsx'), 'KidDashboard.tsx (Kid Mode)');
