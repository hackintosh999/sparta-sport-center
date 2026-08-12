export type NewsCategory = 'all' | 'competitions' | 'trainings' | 'club' | 'achievements' | string;

export interface NewsCategoryOption {
    id: NewsCategory;
    label: string;
}

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    category: NewsCategory;
    imageUrl?: string;
    image?: string;
    mediaUrl?: string;
    videoUrl?: string;
    createdAt?: any;
    likesCount?: number;
    commentsCount?: number;
    viewsCount?: number;
    likes?: any;
    likedBy?: any;
    author?: string;
    published?: boolean;
    pinned?: boolean;
    isPinned?: boolean;
    vkId?: string;
    baseLikes?: number;
    status?: string;
    tags?: string[];
    source?: string;
    readingTime?: number;
}
