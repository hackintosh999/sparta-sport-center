const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, deleteDoc, doc } = require('firebase/firestore');

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
    console.log('--- Cleaning up pending_students for registered children ---');
    
    // Fetch active users in users collection
    const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')));
    const activeUserNames = new Set();
    usersSnap.docs.forEach(d => {
        const data = d.data();
        const name = (data.childName || data.displayName || data.name || '').trim().toLowerCase();
        if (name) activeUserNames.add(name);
    });

    console.log('Active user names in database:', Array.from(activeUserNames));

    // Check pending_students
    const pendingSnap = await getDocs(collection(db, 'pending_students'));
    for (const pDoc of pendingSnap.docs) {
        const pData = pDoc.data();
        const pName = (pData.childFullName || `${pData.childFirstName || ''} ${pData.childLastName || ''}`).trim().toLowerCase();
        if (pName && activeUserNames.has(pName)) {
            console.log(`Marking pending_students doc ${pDoc.id} (${pData.childFullName}) as linked/claimed...`);
            await updateDoc(doc(db, 'pending_students', pDoc.id), {
                status: 'linked',
                claimed: true
            });
        }
    }

    console.log('Cleanup completed successfully!');
    process.exit(0);
}

run().catch(err => {
    console.error('Error cleaning pending students:', err);
    process.exit(1);
});
