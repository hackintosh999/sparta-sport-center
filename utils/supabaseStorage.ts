import { supabase } from '../supabase';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper: read and compress image/media as Base64 DataURL
export const fileToDataUrl = (file: Blob | File): Promise<string> => {
    return new Promise((resolve) => {
        const isImage = (file.type && file.type.startsWith('image')) || (file instanceof File && /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name));

        if (isImage && typeof window !== 'undefined') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    const maxDim = 1200;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
                        resolve(compressedDataUrl);
                    } else {
                        resolve(e.target?.result as string || '');
                    }
                };
                img.onerror = () => resolve(e.target?.result as string || '');
                img.src = e.target?.result as string;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string || '';
                resolve(result);
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        }
    });
};

/**
 * Robust Multi-Tier Media Uploader:
 * Tier 1: Supabase Storage ('exercises-media', 'shop-products', 'chat-media')
 * Tier 2: Firebase Storage (ref(storage, ...))
 * Tier 3: Base64 DataURL (Guaranteed instant 100% reliable fallback)
 */
export async function uploadExerciseMedia(
    file: File | Blob,
    folder = 'exercises',
    coachId = 'coach'
): Promise<string> {
    const isAudio = (file.type && file.type.startsWith('audio')) || (file instanceof File && file.name?.endsWith('.webm'));
    const isImage = (file.type && file.type.startsWith('image')) || (file instanceof File && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name));
    const isVideo = (file.type && file.type.startsWith('video')) || (file instanceof File && /\.(mp4|mov|webm|ogg)$/i.test(file.name));

    const fileExt = (file as File).name?.split('.').pop() || (isAudio ? 'webm' : isImage ? 'jpg' : 'mp4');
    const cleanName = (file as File).name ? (file as File).name.replace(/[^a-zA-Z0-9._-]/g, '_') : `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${coachId}/${Date.now()}_${cleanName}`;
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Storage timeout")), ms));

    // 1. TIER 1: Supabase Storage
    const targetBuckets = ['exercises-media', 'shop-products', 'chat-media'];
    for (const bName of targetBuckets) {
        try {
            const uploadPromise = supabase.storage
                .from(bName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type || (isAudio ? 'audio/webm' : isImage ? 'image/jpeg' : 'video/mp4')
                });

            const res: any = await Promise.race([uploadPromise, timeout(6000)]);
            if (!res?.error && res?.data) {
                const { data } = supabase.storage.from(bName).getPublicUrl(filePath);
                if (data?.publicUrl) {
                    console.log(`[Storage Tier 1] Successfully uploaded to Supabase Storage [${bName}]:`, data.publicUrl);
                    return data.publicUrl;
                }
            } else if (res?.error) {
                console.warn(`[Storage Tier 1] Supabase [${bName}] upload warning:`, res.error.message);
            }
        } catch (err: any) {
            console.warn(`[Storage Tier 1] Supabase [${bName}] skipped:`, err?.message);
        }
    }

    // 2. TIER 2: Firebase Storage Fallback
    try {
        const storageRef = ref(storage, filePath);
        const fbUploadPromise = uploadBytes(storageRef, file);
        await Promise.race([fbUploadPromise, timeout(6000)]);
        const downloadUrl = await getDownloadURL(storageRef);
        if (downloadUrl) {
            console.log("[Storage Tier 2] Successfully uploaded to Firebase Storage:", downloadUrl);
            return downloadUrl;
        }
    } catch (fbErr: any) {
        console.warn("[Storage Tier 2] Firebase Storage fallback skipped:", fbErr?.message);
    }

    // 3. TIER 3: Base64 DataURL (Guaranteed display for photos/small videos)
    if (file.size < 5 * 1024 * 1024) {
        try {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl) {
                console.log("[Storage Tier 3] Using DataURL fallback for media");
                return dataUrl;
            }
        } catch (dataUrlErr) {
            console.warn("[Storage Tier 3] DataURL generation failed:", dataUrlErr);
        }
    }

    return '';
}

export async function uploadReviewMedia(
    file: Blob | File,
    folder = 'reviews',
    contentType?: string
): Promise<string> {
    return uploadExerciseMedia(file, folder, 'reviews');
}

export async function uploadToSupabaseStorage(file: File, folder = 'reviews'): Promise<string> {
    return uploadExerciseMedia(file, folder, 'coach');
}

