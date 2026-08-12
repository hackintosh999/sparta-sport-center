const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, setDoc } = require('firebase/firestore');

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
    const targetEmail = 'nfisah7139@gmail.com';
    console.log('Setting developer role in Firestore for:', targetEmail);
    const q = query(collection(db, 'users'), where('email', '==', targetEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log('Creating user document for', targetEmail);
        const fakeUid = 'dev_' + Date.now();
        await setDoc(doc(db, 'users', fakeUid), {
            email: targetEmail,
            role: 'developer',
            status: 'active',
            isStaff: true,
            isAdmin: true,
            displayName: 'Разработчик Sparta'
        });
        console.log('Created doc with role: developer for', targetEmail);
    } else {
        for (const userDoc of snap.docs) {
            console.log(`Updating doc ${userDoc.id} for ${targetEmail}...`);
            await updateDoc(doc(db, 'users', userDoc.id), {
                role: 'developer',
                status: 'active',
                isStaff: true,
                isAdmin: true
            });
            console.log(`Successfully updated role to 'developer' for doc ${userDoc.id}`);
        }
    }
    process.exit(0);
}

run().catch(err => {
    console.error('Error setting developer role:', err);
    process.exit(1);
});
