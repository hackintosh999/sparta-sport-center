const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, setDoc, arrayUnion } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDirwUTwGdBBxGRsSTBJ_wR8RaTwncPXCE",
    authDomain: "sparta-21df8.firebaseapp.com",
    projectId: "sparta-21df8",
    storageBucket: "sparta-21df8.firebasestorage.app",
    messagingSenderId: "1042761261702",
    appId: "1:1042761261702:web:297be36c3d242d0b826707",
    measurementId: "G-WH5DLLX7ZB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const studentEmail = 'testaccountnewq222@gmail.com';
    const parentEmail = 'elena.parent@gmail.com';

    console.log('--- 1. Repairing Student Account:', studentEmail);
    const childQ = query(collection(db, 'users'), where('email', '==', studentEmail));
    const childSnap = await getDocs(childQ);
    let childUid = '';

    if (childSnap.empty) {
        childUid = 'child_' + Date.now();
        console.log('Creating child document for:', studentEmail);
        await setDoc(doc(db, 'users', childUid), {
            email: studentEmail,
            displayName: 'Тепляшин Иван',
            name: 'Тепляшин Иван',
            childName: 'Тепляшин Иван',
            childFirstName: 'Иван',
            childLastName: 'Тепляшин',
            role: 'user',
            status: 'active'
        });
    } else {
        const childDoc = childSnap.docs[0];
        childUid = childDoc.id;
        console.log(`Updating child doc ${childUid}...`);
        await updateDoc(doc(db, 'users', childUid), {
            displayName: 'Тепляшин Иван',
            name: 'Тепляшин Иван',
            childName: 'Тепляшин Иван',
            childFirstName: 'Иван',
            childLastName: 'Тепляшин',
            role: 'user',
            status: 'active'
        });
    }
    console.log(`Child UID: ${childUid}`);

    console.log('--- 2. Repairing Parent Account:', parentEmail);
    const parentQ = query(collection(db, 'users'), where('email', '==', parentEmail));
    const parentSnap = await getDocs(parentQ);

    if (parentSnap.empty) {
        const parentUid = 'parent_' + Date.now();
        console.log('Creating parent document for:', parentEmail);
        await setDoc(doc(db, 'users', parentUid), {
            email: parentEmail,
            displayName: 'Тепляшина Елена',
            name: 'Тепляшина Елена',
            parentName: 'Тепляшина Елена',
            parentFirstName: 'Елена',
            parentLastName: 'Тепляшина',
            role: 'parent',
            status: 'active',
            childrenIds: [childUid]
        });
        // Link child back to parent
        await updateDoc(doc(db, 'users', childUid), { parentId: parentUid });
    } else {
        const parentDoc = parentSnap.docs[0];
        const parentUid = parentDoc.id;
        console.log(`Updating parent doc ${parentUid}...`);
        await updateDoc(doc(db, 'users', parentUid), {
            displayName: 'Тепляшина Елена',
            name: 'Тепляшина Елена',
            parentName: 'Тепляшина Елена',
            parentFirstName: 'Елена',
            parentLastName: 'Тепляшина',
            role: 'parent',
            status: 'active',
            childrenIds: arrayUnion(childUid)
        });
        // Link child back to parent
        await updateDoc(doc(db, 'users', childUid), { parentId: parentUid });
    }

    console.log('Data repair finished successfully!');
    process.exit(0);
}

run().catch(err => {
    console.error('Error repairing student/parent docs:', err);
    process.exit(1);
});
