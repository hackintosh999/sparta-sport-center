const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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
    console.log('Updating second child doc hpwEh5bOdivrHRVhl3hs to Тепляшин Алексей...');
    await updateDoc(doc(db, 'users', 'hpwEh5bOdivrHRVhl3hs'), {
        displayName: 'Тепляшин Алексей',
        name: 'Тепляшин Алексей',
        childName: 'Тепляшин Алексей',
        childFirstName: 'Алексей',
        childLastName: 'Тепляшин',
        childAge: 9
    });
    console.log('Successfully updated second child doc!');
    process.exit(0);
}

run().catch(err => {
    console.error('Error updating second child doc:', err);
    process.exit(1);
});
