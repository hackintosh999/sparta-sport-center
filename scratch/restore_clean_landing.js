import { execSync } from 'child_process';
import fs from 'fs';
import parser from '@babel/parser';

// Read fresh from git show HEAD
let content = execSync('git show HEAD:components/LandingPage.tsx', { encoding: 'utf8' });

// 1. Trim leading non-printable characters
const firstImport = content.indexOf('import React');
if (firstImport >= 0) content = content.substring(firstImport);

// 2. Trim trailing garbage after export default LandingPage;
const expIdx = content.indexOf('export default LandingPage;');
if (expIdx >= 0) {
    content = content.substring(0, expIdx + 'export default LandingPage;'.length) + '\n';
}

// 3. Ensure ProfileSetupModal import is present
if (!content.includes("import ProfileSetupModal from './ProfileSetupModal';")) {
    content = content.replace("import ContactModal from './ContactModal';", "import ProfileSetupModal from './ProfileSetupModal';\nimport ContactModal from './ContactModal';");
}

// 4. Ensure BonusModal import is present
if (!content.includes("import BonusModal from './bonus/BonusModal';")) {
    content = content.replace("import GroupsSection from './GroupsSection';", "import BonusModal from './bonus/BonusModal';\nimport GroupsSection from './GroupsSection';");
}

// 5. Ensure BonusModal and ProfileSetupModal JSX tags are present near bottom
const termsTag = '<TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />';
if (content.includes(termsTag) && !content.includes('<BonusModal isOpen={isBonusOpen}')) {
    content = content.replace(termsTag, `${termsTag}\n            <BonusModal isOpen={isBonusOpen} onClose={() => setIsBonusOpen(false)} />`);
}

const authTag = '<AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />';
if (content.includes(authTag) && !content.includes('<ProfileSetupModal isOpen={isProfileSetupOpen}')) {
    content = content.replace(authTag, `${authTag}\n            <ProfileSetupModal isOpen={isProfileSetupOpen} onClose={() => setIsProfileSetupOpen(false)} />`);
}

// Verify with Babel parser
try {
    parser.parse(content, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    fs.writeFileSync('components/LandingPage.tsx', content, 'utf8');
    console.log('LandingPage.tsx fully restored from git HEAD and parsed with 0 errors!');
} catch (e) {
    console.error('Parse error:', e.message);
}
