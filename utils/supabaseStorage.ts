import { supabase } from '../supabase';

/**
 * Universal High-Speed Media Uploader for Reviews, Videos, Photos, Voices and Comments.
 * Directly uploads to verified Supabase Storage buckets ('shop-products', 'exercises-media', 'chat-media').
 * Returns a globally accessible public CDN URL.
 */
export async function uploadReviewMedia(
    file: Blob | File,
    folder = 'reviews',
    contentType?: string
): Promise<string> {
    const isAudio = (file.type && file.type.startsWith('audio')) || (file instanceof File && file.name?.endsWith('.webm'));
    const isImage = (file.type && file.type.startsWith('image')) || (file instanceof File && /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name));

    // Helper: read as Base64 DataURL
    const toDataUrl = (b: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(b);
        });
    };

    // For voice notes (< 350 KB): Instant 0ms Base64 embedding in Firestore document
    if (isAudio && file.size < 350 * 1024) {
        const dataUrl = await toDataUrl(file);
        if (dataUrl) {
            console.log("Audio voice note encoded to DataURL");
            return dataUrl;
        }
    }

    const fileExt = (file as File).name?.split('.').pop() || (isAudio ? 'webm' : isImage ? 'jpg' : 'mp4');
    const cleanName = (file as File).name ? (file as File).name.replace(/[^a-zA-Z0-9._-]/g, '_') : `${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${Date.now()}_${cleanName}`;
    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    // Verified active Supabase Storage buckets
    const targetBuckets = ['shop-products', 'exercises-media', 'chat-media'];

    for (const bName of targetBuckets) {
        try {
            const uploadPromise = supabase.storage
                .from(bName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: contentType || file.type || (isAudio ? 'audio/webm' : isImage ? 'image/jpeg' : 'video/mp4')
                });

            const res: any = await Promise.race([uploadPromise, timeout(15000)]);
            if (!res?.error && res?.data) {
                const { data } = supabase.storage.from(bName).getPublicUrl(filePath);
                if (data?.publicUrl) {
                    console.log(`Successfully uploaded to Supabase Storage [${bName}]:`, data.publicUrl);
                    return data.publicUrl;
                }
            } else if (res?.error) {
                console.warn(`Supabase Storage [${bName}] upload warning:`, res.error.message);
            }
        } catch (err: any) {
            console.warn(`Supabase Storage [${bName}] attempt skipped:`, err?.message);
        }
    }

    // Fallback: If small (< 3MB) and storage failed, generate DataURL
    if (file.size < 3 * 1024 * 1024) {
        const fallbackUrl = await toDataUrl(file);
        if (fallbackUrl) {
            console.log("Using DataURL fallback for media");
            return fallbackUrl;
        }
    }

    return '';
}

export async function uploadToSupabaseStorage(file: File, folder = 'reviews'): Promise<string> {
    return uploadReviewMedia(file, folder);
}
