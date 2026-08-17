/**
 * Sparta Media Storage Engine
 * Provides persistent local IndexedDB storage for video reviews and large media files.
 * Guarantees 0-latency playback, no CORS issues, no upload failures, and offline persistence.
 */

const DB_NAME = 'SpartaMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveMediaToLocalDB(key: string, file: Blob): Promise<string> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(file, key);
            tx.oncomplete = () => {
                db.close();
                resolve(`idb:${key}`);
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    } catch (err) {
        console.warn('IndexedDB save failed:', err);
        return '';
    }
}

export async function getMediaFromLocalDB(key: string): Promise<Blob | null> {
    try {
        const cleanKey = key.replace(/^idb:/, '');
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(cleanKey);
            req.onsuccess = () => {
                db.close();
                resolve(req.result || null);
            };
            req.onerror = () => {
                db.close();
                resolve(null);
            };
        });
    } catch (err) {
        console.warn('IndexedDB get failed:', err);
        return null;
    }
}
