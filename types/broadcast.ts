export interface Broadcast {
    id: string;
    title: string;
    description?: string;
    videoUrl?: string;
    streamUrl?: string;
    isLive?: boolean;
    scheduledAt?: any;
    date?: any;
    createdAt?: any;
    updatedAt?: any;
    thumbnailUrl?: string;
    viewersCount?: number;
    tags?: string[];
}
