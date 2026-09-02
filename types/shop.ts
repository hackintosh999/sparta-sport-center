export interface Product {
    id: string;
    title: string;
    price: number;
    category: string;
    description: string;
    imageUrl: string;
    colors?: string[];
    sizes?: string[]; // S, M, L, XL, etc.
    gallery?: string[]; // Additional images
    specifications?: Record<string, string>; // Material: Cotton, Weight: 200g
    rating?: number;
    reviews?: Review[];
    orderLink?: string;
    createdAt?: any;
    updatedAt?: any;
    oldPrice?: number;
    isHidden?: boolean;
    badges?: string[];
    stock?: number | Record<string, number>;
    isCustomizable?: boolean;
    isMadeToOrder?: boolean; // When true, item is tailored on demand, no strict stock limit
    lowStockThreshold?: number; // Custom threshold for "🔥 Low stock" warning (default: 3)
    sizeChartUrl?: string;
    sizeChartId?: string;
    colorImages?: Record<string, string>;
    productionTime?: string;
    deliveryInfo?: string;
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
    audio?: string;
    verified?: boolean;
    isVerified?: boolean;
    isFeatured?: boolean;
    helpful?: number | any[];
    reactions?: Record<string, number> | number;
    clubResponse?: string | any;
    role?: string;
    userRole?: string;
    childName?: string;
    groupName?: string;
    userReactions?: Record<string, string>; // userId -> emoji
    emotionTags?: string[];
    userVerification?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    isRewardClaimed?: boolean;
    respondedAt?: any;
    isPinned?: boolean;
    pinnedAt?: any;
    pinnedBy?: string;
    staffLikes?: { userId: string; name: string; role: string }[];
    viewsCount?: number;
}

export interface ReviewReply {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    comment: string;
    createdAt: any;
    updatedAt?: any;
    userRole?: string;
    userVerification?: boolean;
    audio?: string;
    photos?: string[];
    video?: string;
    replyToUser?: string;
    replyToText?: string;
    replyToCommentId?: string;
    isEdited?: boolean;
    likes?: string[];
}

export interface Order {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    productId: string;
    productTitle: string;
    status: 'new' | 'processing' | 'completed' | 'cancelled' | 'shipped' | 'delivered' | 'ready_for_pickup';
    createdAt: any;
    items?: any[];
    date?: any;
    totalAmount?: number;
    paymentMethod?: string;
    price?: number;
}

export interface User {
    id: string;
    email: string;
    role: 'user' | 'admin' | 'director' | 'coach' | 'trainer' | 'parent' | 'developer' | string;
    status: 'active' | 'deleted' | 'banned' | string;
    displayName?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    photoURL?: string;
    image?: string;
    coachId?: string;
    isStaff?: boolean;
    isAdmin?: boolean;
    parentName: string;
    parentPhone: string;
    childName: string;
    childAge: number;
    childGender?: 'male' | 'female';
    balance: number;
    bonuses: number;
    groupId?: string;
    achievements?: UserAchievement[];
    createdAt: any;
    experienceLevel?: ExperienceLevel;
    otherSports?: string;
    preferredSchedule?: {
        days: string[];
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'any';
    };
    ban?: BanDetails;
}

export interface Group {
    id: string;
    name: string;
    ageRange: {
        min: number;
        max: number;
    };
    coachId: string;
    schedule: ScheduleItem[];
    createdAt: any;
    currentStatus?: 'normal' | 'cancelled' | 'substitute';
    statusMessage?: string;
    substituteCoachId?: string;
    difficultyLevel?: ExperienceLevel;
    category?: string;
    maxStudents?: number;
    chatId?: string;
    intensity?: string;
    focus?: string;
    socialAtmosphere?: string;
    coachName?: string;
    trainerName?: string;
    trainer?: string;
    coachImage?: string;
    trainerPhoto?: string;
}

export interface ScheduleItem {
    day: string;
    time: string;
    activity?: string;
    endTime?: string;
    location?: string;
}

export interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    category: string;
    type: '2d' | '3d';
    mediaUrl: string;
    rarity: 'common' | 'rare' | 'legendary';
    iconPreset?: string;
    rewardCoins?: number;
    awardType?: 'trophy' | 'diploma' | 'certificate' | 'shield';
    motto?: string;
    createdAt: any;
    updatedAt?: any;
}

export interface UserAchievement {
    id: string;
    definitionId: string;
    date: any;
    reason?: string;
    grantedBy?: string;
    isNew?: boolean;
}

export type ExperienceLevel = 'newbie' | 'amateur' | 'pro';

export interface BanDetails {
    isBanned: boolean;
    type: 'account' | 'device' | 'ip';
    reason: string;
    expiresAt: number | null;
    bannedAt: number;
    bannedBy: string;
    deviceFingerprint?: string;
    ipAddress?: string;
}

export interface SizeData {
    size: string;
    label?: string;
    chest?: string;
    waist?: string;
    height?: string;
    length?: string;
    chestMin?: number;
    chestMax?: number;
    waistMin?: number;
    waistMax?: number;
    hipsMin?: number;
    hipsMax?: number;
}

export interface SizeChart {
    id: string;
    name: string;
    category: string;
    data?: SizeData[];
    type?: string;
    imageUrl?: string;
    measurements?: any;
    disclaimers?: string[];
}

export interface CartItem {
    id?: string;
    product: Product;
    productId?: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
    customName?: string;
    customNumber?: string;
    measurements?: any;
    fitStyle?: string;
}

export type Temperament = 'sanguine' | 'choleric' | 'phlegmatic' | 'melancholic' | 'leader' | 'team_player' | 'shy_start' | 'energetic';