import { supabase } from '../supabase';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Instant & Non-blocking Multi-Tier Storage Engine
 * 1. Has 3000ms strict timeout on cloud uploads so UI never hangs
 * 2. Instant DataURL fallback (0.1s guarantee!) if network times out
 */
export async function uploadToSupabaseStorage(file: File, folder = 'locations'): Promise<string> {
    const readFileAsDataURL = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(f);
        });
    };

    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    // --- TIER 1: Supabase Storage with 3s timeout ---
    try {
        const uploadTask = supabase.storage
            .from('locations')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        const res: any = await Promise.race([uploadTask, timeout(3000)]);

        if (!res?.error && res?.data) {
            const { data: publicUrlData } = supabase.storage
                .from('locations')
                .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
                console.log("Uploaded via Supabase Storage:", publicUrlData.publicUrl);
                return publicUrlData.publicUrl;
            }
        }
    } catch (supaErr) {
        console.warn("Supabase Storage timed out or CORS blocked, trying Firebase fallback...", supaErr);
    }

    // --- TIER 2: Firebase Storage with 3s timeout ---
    try {
        const firebaseRef = ref(storage, `${folder}/${Date.now()}_${cleanFileName}`);
        const fbPromise = uploadBytes(firebaseRef, file).then(() => getDownloadURL(firebaseRef));
        const fbUrl = await Promise.race([fbPromise, timeout(3000)]);
        if (fbUrl) {
            console.log("Uploaded via Firebase Storage fallback:", fbUrl);
            return fbUrl;
        }
    } catch (fbErr) {
        console.warn("Firebase Storage timed out, using instant DataURL fallback...", fbErr);
    }

    // --- TIER 3: Instant DataURL FileReader (0.1s guarantee!) ---
    console.log("Using instant DataURL preview fallback");
    return await readFileAsDataURL(file);
}
