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
    console.log('Searching for user with email: nfisah7139@gmail.com');
    const targetEmail = 'nfisah7139@gmail.com';
    const q = query(collection(db, 'users'), where('email', '==', targetEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log('No existing document found for', targetEmail, '. Creating one...');
        // Create user document if it doesn't exist yet
        const fakeUid = 'dev_' + Date.now();
        await setDoc(doc(db, 'users', fakeUid), {
            email: targetEmail,
            role: 'developer',
            isStaff: true,
            isAdmin: true,
            status: 'active',
            displayName: 'Разработчик Sparta'
        });
        console.log('Created user doc with role: developer for', targetEmail);
    } else {
        for (const userDoc of snap.docs) {
            console.log(`Updating user doc ${userDoc.id} for ${targetEmail}...`);
            await updateDoc(doc(db, 'users', userDoc.id), {
                role: 'developer',
                isStaff: true,
                isAdmin: true,
                status: 'active'
            });
            console.log(`Successfully restored role: 'developer' for user doc ${userDoc.id}`);
        }
    }
    process.exit(0);
}

run().catch(err => {
    console.error('Error updating user role:', err);
    process.exit(1);
});
