export interface ReviewReply {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    comment: string;
    createdAt: any;
    userRole?: any;
    userVerification?: any;
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    userPhoto?: string;
    rating: number;
    comment: string;
    text?: string;
    createdAt: any;
    updatedAt?: any;
    likes?: any;
    replies?: ReviewReply[];
    photos?: string[];
    image?: string;
    video?: string;
    videoUrl?: string;
    verified?: boolean;
    isVerified?: any;
    isFeatured?: boolean;
    helpful?: any;
    reactions?: any;
    clubResponse?: any;
    role?: string;
    userRole?: any;
    userVerification?: any;
    status?: 'pending' | 'approved' | 'rejected';
    isRewardClaimed?: boolean;
    respondedAt?: any;
}
