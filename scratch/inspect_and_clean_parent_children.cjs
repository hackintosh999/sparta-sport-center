const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc } = require('firebase/firestore');

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
    console.log('--- Inspecting Parent elena.parent@gmail.com ---');
    const parentQ = query(collection(db, 'users'), where('email', '==', 'elena.parent@gmail.com'));
    const parentSnap = await getDocs(parentQ);

    if (parentSnap.empty) {
        console.log('Parent doc not found!');
        process.exit(1);
    }

    const parentDoc = parentSnap.docs[0];
    const parentData = parentDoc.data();
    console.log('Parent doc ID:', parentDoc.id);
    console.log('Parent childrenIds:', parentData.childrenIds);

    const rawIds = parentData.childrenIds || [];
    const uniqueIds = Array.from(new Set(rawIds));
    console.log('Unique childrenIds:', uniqueIds);

    // Fetch details of each child UID
    const childrenDetails = [];
    for (const childId of uniqueIds) {
        const cSnap = await getDoc(doc(db, 'users', childId));
        if (cSnap.exists()) {
            childrenDetails.push({ id: cSnap.id, ...cSnap.data() });
        }
    }
    console.log('Children Details:', childrenDetails);

    // If duplicate IDs or multiple children with identical names exist:
    // Update parent doc with strictly unique childrenIds array
    await updateDoc(doc(db, 'users', parentDoc.id), {
        childrenIds: uniqueIds
    });
    console.log('Successfully updated parent document with deduplicated childrenIds:', uniqueIds);

    process.exit(0);
}

run().catch(err => {
    console.error('Error cleaning parent children:', err);
    process.exit(1);
});
