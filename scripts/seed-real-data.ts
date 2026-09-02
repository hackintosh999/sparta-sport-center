import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

// 1. Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyDirwUTwGdBBxGRsSTBJ_wR8RaTwncPXCE',
    authDomain: 'sparta-21df8.firebaseapp.com',
    projectId: 'sparta-21df8',
    storageBucket: 'sparta-21df8.firebasestorage.app',
    messagingSenderId: '1042761261702',
    appId: '1:1042761261702:web:297be36c3d242d0b826707'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper for phone normalization (+79XXXXXXXXX)
function normalizePhone(raw: any): string {
    if (!raw) return '';
    let digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10 && digits.startsWith('9')) {
        digits = '7' + digits;
    } else if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.slice(1);
    }
    return '+' + digits;
}

// 7 Target Groups Configuration
interface GroupConfig {
    id: string;
    name: string;
    coachKey: 'yakupov' | 'kubar' | 'ponomarev';
    ageRange: { min: number; max: number };
    ageCategory: string;
    excelFile: string;
    sheetName: string;
}

const GROUPS_CONFIG: GroupConfig[] = [
    // Pavel Yakupov Group
    {
        id: 'group_yakupov_2016_2018',
        name: 'Спарта 2016–2018 (Якупов П.В.)',
        coachKey: 'yakupov',
        ageRange: { min: 6, max: 8 },
        ageCategory: '2016-2018',
        excelFile: 'список групп 1 - 2026.xlsx',
        sheetName: '2016-2017-2018 Якупов Павел Вал'
    },
    // Sergei Kubar Group
    {
        id: 'group_kubar_2014_2015',
        name: 'Спарта 2014–2015 (Кубарь С.И.)',
        coachKey: 'kubar',
        ageRange: { min: 9, max: 10 },
        ageCategory: '2014-2015',
        excelFile: 'список групп 1 - 2026.xlsx',
        sheetName: '2014-2015 КУбарь Сергей Игореви'
    },
    // Sergei Ponomarev Groups (5)
    {
        id: 'group_ponomarev_2014_2012',
        name: 'Спарта 2014–2012 (Пономарев С.А.)',
        coachKey: 'ponomarev',
        ageRange: { min: 10, max: 12 },
        ageCategory: '2012-2014',
        excelFile: 'список групп 1 - 2026.xlsx',
        sheetName: '2014-2012 Пономарев Сергей Алек'
    },
    {
        id: 'group_ponomarev_2013',
        name: 'Спарта 2013 (Пономарев С.А.)',
        coachKey: 'ponomarev',
        ageRange: { min: 11, max: 11 },
        ageCategory: '2013',
        excelFile: 'список групп 1 - 2026.xlsx',
        sheetName: '2013 Пономарев Сергей Александр'
    },
    {
        id: 'group_ponomarev_2015_2012',
        name: 'Спарта 2015–2012 (Пономарев С.А.)',
        coachKey: 'ponomarev',
        ageRange: { min: 9, max: 12 },
        ageCategory: '2012-2015',
        excelFile: 'список групп на 2- 2026.xlsx',
        sheetName: 'гр. Пономарев 2015-2012'
    },
    {
        id: 'group_ponomarev_malyshi_2016_2018',
        name: 'Спарта Малыши 2016–2018 (Пономарев С.А.)',
        coachKey: 'ponomarev',
        ageRange: { min: 6, max: 8 },
        ageCategory: '2016-2018',
        excelFile: 'список групп на 2- 2026.xlsx',
        sheetName: 'Гр. Малыши Пономарев 2018-2016'
    },
    {
        id: 'group_ponomarev_2019_2021',
        name: 'Спарта 2019–2021 (Пономарев С.А.)',
        coachKey: 'ponomarev',
        ageRange: { min: 3, max: 5 },
        ageCategory: '2019-2021',
        excelFile: 'список групп на 2- 2026.xlsx',
        sheetName: 'Пономарев 2019-2021'
    }
];

interface ParsedStudent {
    num: number;
    studentName: string;
    parentName: string;
    cleanPhone: string;
    groupConfig: GroupConfig;
}

function parseExcelStudents(projectRoot: string): ParsedStudent[] {
    const allStudents: ParsedStudent[] = [];

    for (const config of GROUPS_CONFIG) {
        const filePath = path.join(projectRoot, config.excelFile);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Excel file not found: ${filePath}`);
        }

        const wb = xlsx.readFile(filePath);
        const ws = wb.Sheets[config.sheetName];
        if (!ws) {
            throw new Error(`Sheet "${config.sheetName}" not found in ${config.excelFile}`);
        }

        const rows = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });
        let groupCount = 0;

        for (const row of rows) {
            if (!row || row.length < 2) continue;
            const num = row[0];
            const name = row[1];
            const rawPhone = row[2];
            const parent = row[3];

            if (typeof num === 'number' || (typeof num === 'string' && /^\d+$/.test(num.trim()))) {
                if (typeof name === 'string' && name.trim().length > 1) {
                    const parsed: ParsedStudent = {
                        num: Number(num),
                        studentName: name.trim(),
                        parentName: parent ? String(parent).trim() : '',
                        cleanPhone: normalizePhone(rawPhone),
                        groupConfig: config
                    };
                    allStudents.push(parsed);
                    groupCount++;
                }
            }
        }

        console.log(`✓ Parsed "${config.name}": ${groupCount} students`);
    }

    return allStudents;
}

async function main() {
    console.log('=====================================================');
    console.log('SPARTA SPORTS CENTER: SAFE DATA SEED & CLEANUP');
    console.log('=====================================================\n');

    const projectRoot = process.cwd();
    const students = parseExcelStudents(projectRoot);
    console.log(`\n-> Total students parsed across 7 groups: ${students.length}`);
    if (students.length !== 131) {
        console.warn(`⚠️ Warning: expected 131 students, but found ${students.length}`);
    }

    // =======================================================
    // STEP 1: SAFE CLEANUP OF OLD MOCK DATA
    // =======================================================
    console.log('\n--- 1. Cleaning old mock groups, students and dummy users ---');

    // 1.1 Clean groups
    const groupsSnap = await getDocs(collection(db, 'groups'));
    console.log(`Found ${groupsSnap.size} existing groups to remove/replace.`);
    for (const groupDoc of groupsSnap.docs) {
        console.log(`  Deleting old group: ${groupDoc.id} ("${groupDoc.data().name || ''}")`);
        await deleteDoc(groupDoc.ref);
    }
    console.log('✓ Old groups cleaned successfully.');

    // 1.2 Clean students collection
    const studentsSnap = await getDocs(collection(db, 'students'));
    console.log(`Found ${studentsSnap.size} existing documents in 'students'.`);
    for (const stdDoc of studentsSnap.docs) {
        console.log(`  Deleting old student doc: ${stdDoc.id} ("${stdDoc.data().name || ''}")`);
        await deleteDoc(stdDoc.ref);
    }
    console.log('✓ Old students collection cleaned successfully.');

    // 1.3 Clean old dummy users with role: 'user' or 'student' (KEEPING REAL ACCOUNTS)
    const usersSnap = await getDocs(collection(db, 'users'));
    let deletedDummyUsers = 0;
    for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const role = u.role;
        const email = u.email || '';
        const name = (u.displayName || u.name || '').toLowerCase();

        // STRICT SAFETY CHECK:
        // Do NOT delete any staff/admin/coach/director/developer/super
        if (['admin', 'director', 'developer', 'super', 'coach', 'trainer'].includes(role)) {
            continue;
        }

        // Do NOT delete Sergei Kubar
        if (uDoc.id === 'xoQoUG2WnwfXLXavcr0KQ7JDKYT2' || name.includes('кубарь')) {
            continue;
        }

        // Do NOT delete Sergei Ponomarev
        if (uDoc.id === 'staff_1787340664107' || name.includes('пономарев') || name.includes('пономарёв')) {
            continue;
        }

        // Do NOT delete real parent accounts with active auth email (e.g. gmail/icloud)
        if (email && !email.includes('temp_parent_') && !email.includes('@sparta.ru') && role === 'parent') {
            console.log(`  Preserving real parent user: ${uDoc.id} (${u.displayName || u.name}, ${email})`);
            continue;
        }

        // Delete mock/dummy user placeholder
        if (role === 'user' || role === 'student' || email.includes('temp_parent_')) {
            console.log(`  Deleting dummy user: ${uDoc.id} (${u.displayName || u.name || 'Unknown'})`);
            await deleteDoc(uDoc.ref);
            deletedDummyUsers++;
        }
    }
    console.log(`✓ Cleaned ${deletedDummyUsers} dummy user records.`);

    // =======================================================
    // STEP 2: SETUP & LINK COACHES
    // =======================================================
    console.log('\n--- 2. Setting up actual coach accounts ---');

    // 2.1 Sergei Ponomarev (Account: sergei123@gmail.com)
    let ponomarevId = 'staff_1787340664107';
    const ponomarevRef = doc(db, 'users', ponomarevId);
    await setDoc(ponomarevRef, {
        name: 'Пономарев Сергей Александрович',
        displayName: 'Сергей Пономарев',
        full_name: 'Пономарев Сергей Александрович',
        role: 'coach',
        coachId: ponomarevId,
        email: 'sergei123@gmail.com',
        phone: '7(732)543234',
        status: 'active',
        updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`✓ Coach Sergei Ponomarev set up: ${ponomarevId}`);

    // 2.2 Sergei Kubar (Account: sergejkubar831@gmail.com, existing id: xoQoUG2WnwfXLXavcr0KQ7JDKYT2)
    let kubarId = 'xoQoUG2WnwfXLXavcr0KQ7JDKYT2';
    const kubarRef = doc(db, 'users', kubarId);
    await setDoc(kubarRef, {
        name: 'Кубарь Сергей Игоревич',
        displayName: 'Сергей Кубарь',
        full_name: 'Кубарь Сергей Игоревич',
        role: 'coach',
        coachId: kubarId,
        email: 'sergejkubar831@gmail.com',
        status: 'active',
        updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`✓ Coach Sergei Kubar set up: ${kubarId}`);

    // 2.3 Pavel Yakupov
    let yakupovId = 'staff_coach_yakupov';
    // Check if Yakupov already exists in users
    for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const n = (u.displayName || u.name || '').toLowerCase();
        if (n.includes('якупов')) {
            yakupovId = uDoc.id;
            break;
        }
    }
    const yakupovRef = doc(db, 'users', yakupovId);
    await setDoc(yakupovRef, {
        name: 'Якупов Павел Валерьевич',
        displayName: 'Павел Якупов',
        full_name: 'Якупов Павел Валерьевич',
        role: 'coach',
        coachId: yakupovId,
        email: 'yakupov.pavel@sparta.ru',
        phone: '+7 (900) 000-00-00',
        status: 'active',
        updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`✓ Coach Pavel Yakupov set up: ${yakupovId}`);

    const coachMap = {
        yakupov: { id: yakupovId, name: 'Павел Якупов', fullName: 'Якупов Павел Валерьевич' },
        kubar: { id: kubarId, name: 'Сергей Кубарь', fullName: 'Кубарь Сергей Игоревич' },
        ponomarev: { id: ponomarevId, name: 'Сергей Пономарев', fullName: 'Пономарев Сергей Александрович' }
    };

    // =======================================================
    // STEP 3: CREATE 7 CANONICAL GROUPS IN FIRESTORE
    // =======================================================
    console.log('\n--- 3. Creating 7 groups in Firestore ---');
    for (const gConfig of GROUPS_CONFIG) {
        const coach = coachMap[gConfig.coachKey];
        const groupRef = doc(db, 'groups', gConfig.id);

        const groupData = {
            id: gConfig.id,
            name: gConfig.name,
            coachId: coach.id,
            coachName: coach.name,
            coachFullName: coach.fullName,
            ageRange: gConfig.ageRange,
            ageCategory: gConfig.ageCategory,
            currentStatus: 'normal',
            status: 'active',
            maxStudents: 30,
            schedule: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(groupRef, groupData);
        console.log(`✓ Created group: [${gConfig.id}] "${gConfig.name}" -> Coach: ${coach.name}`);
    }

    // =======================================================
    // STEP 4: IMPORT 131 STUDENTS
    // =======================================================
    console.log('\n--- 4. Importing 131 students into Firestore ---');

    let importedCount = 0;
    let batch = writeBatch(db);
    let batchOps = 0;

    for (const student of students) {
        const coach = coachMap[student.groupConfig.coachKey];
        const studentDocId = `std_${student.groupConfig.id}_${student.num}`;

        const studentData = {
            displayName: student.studentName,
            name: student.studentName,
            childName: student.studentName,
            role: 'user',
            groupId: student.groupConfig.id,
            groupName: student.groupConfig.name,
            coachId: coach.id,
            coachName: coach.name,
            parentName: student.parentName || '',
            parentPhone: student.cleanPhone,
            phone: student.cleanPhone,
            isRegistered: false,
            status: 'pending_registration',
            type: 'offline',
            createdAt: new Date().toISOString()
        };

        // 4.1 Write to users collection
        const userRef = doc(db, 'users', studentDocId);
        batch.set(userRef, studentData);
        batchOps++;

        // 4.2 Write to students collection
        const stdRef = doc(db, 'students', studentDocId);
        batch.set(stdRef, {
            ...studentData,
            studentId: studentDocId,
            id: studentDocId
        });
        batchOps++;

        importedCount++;

        // Commit batch when reaching 400 operations (Firestore limit is 500)
        if (batchOps >= 400) {
            await batch.commit();
            console.log(`  Committed batch (${importedCount} students written)...`);
            batch = writeBatch(db);
            batchOps = 0;
        }
    }

    if (batchOps > 0) {
        await batch.commit();
        console.log(`  Committed final batch.`);
    }

    console.log(`\n=====================================================`);
    console.log(`🎉 IMPORT COMPLETE! Successfully loaded ${importedCount} students across 7 groups.`);
    console.log(`=====================================================\n`);
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error during seed execution:', err);
    process.exit(1);
});
