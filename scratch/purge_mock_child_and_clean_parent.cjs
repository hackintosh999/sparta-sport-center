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
    console.log('--- 1. Deleting Mock Child hpwEh5bOdivrHRVhl3hs ---');
    try {
        await deleteDoc(doc(db, 'users', 'hpwEh5bOdivrHRVhl3hs'));
        console.log('Successfully deleted mock child doc hpwEh5bOdivrHRVhl3hs');
    } catch (e) {
        console.error('Error deleting mock child doc:', e);
    }

    console.log('--- 2. Updating Parent elena.parent@gmail.com childrenIds ---');
    const parentQ = query(collection(db, 'users'), where('email', '==', 'elena.parent@gmail.com'));
    const parentSnap = await getDocs(parentQ);

    if (!parentSnap.empty) {
        const parentDoc = parentSnap.docs[0];
        const ivanUid = 'ldvRoeWX5pYZ5OBaGCAqOkRA6ax2';
        await updateDoc(doc(db, 'users', parentDoc.id), {
            childrenIds: [ivanUid]
        });
        console.log(`Parent doc ${parentDoc.id} updated with childrenIds: [${ivanUid}]`);
    } else {
        console.log('Parent doc not found!');
    }

    console.log('Purge and cleanup completed!');
    process.exit(0);
}

run().catch(err => {
    console.error('Error purging mock child:', err);
    process.exit(1);
});
