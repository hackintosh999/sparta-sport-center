export type AgeCategory = 'JUNIOR_3_6' | 'SENIOR_7_14' | 'ALL';
export type SubscriptionType = 'monthly' | 'sessions' | 'single' | 'trial';
export type SubscriptionStatus = 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'PENDING' | 'active' | 'frozen' | 'expired' | 'pending';

export interface FreezeHistoryItem {
    id?: string;
    frozenAt: any;
    unfreezeAt?: any;
    days: number;
    reason: 'illness' | 'vacation' | 'other' | string;
    note?: string;
    approvedBy?: string;
}

export interface SubscriptionPlan {
    id: string;
    title: string;
    description?: string;
    cityId: string; // 'chelyabinsk' | 'novosibirsk' | 'all'
    cityName?: string;
    branchId?: string; // 'newton' | 'tatischeva' | 'chtz' | 'bolshevist' | 'myasnikova' | 'all'
    branchName?: string;
    branchIds?: string[]; // Multiple branch IDs if multi-pass
    isUniversal?: boolean; // True if works across all/multiple branches
    ageCategory: AgeCategory;
    ageLabel?: string; // e.g. '3–6 лет' | '7–14 лет'
    scheduleSlots: string[]; // e.g. ['18:00 - 19:00', '19:00 - 20:00']
    scheduleDays?: string; // e.g. 'Пн, Ср, Пт'
    type: SubscriptionType;
    totalSessions: number | null; // null for unlimited
    validityDays: number; // Duration in days (e.g. 30, 90)
    price: number;
    oldPrice?: number;
    perSessionPrice?: number;
    isActive: boolean;
    features?: string[];
    badge?: string;
    isPopular?: boolean;
    sortOrder?: number;
    createdAt?: any;
    updatedAt?: any;
}

export interface UserSubscription {
    planId: string;
    title: string;
    childId: string;
    childName: string;
    parentId?: string;
    parentPhone?: string;
    parentEmail?: string;
    cityId: string;
    cityName?: string;
    branchId: string;
    branchName: string;
    isUniversal?: boolean;
    ageCategory: AgeCategory;
    scheduleSlot?: string;
    scheduleDays?: string;
    scheduleTime?: string;
    type?: SubscriptionType;
    totalSessions: number | null; // e.g. 8, 12, null
    remainingSessions: number | null; // decrements on visit/miss
    activatedAt: any;
    startedAt?: any;
    startDate?: any;
    expiresAt: any;
    status: SubscriptionStatus;
    isFrozen?: boolean;
    frozenAt?: any;
    frozenUntil?: any;
    freezeDaysTotal?: number;
    freezeDaysAvailable?: number;
    freezeReason?: string;
    freezeHistory?: FreezeHistoryItem[];
    purchasePrice?: number;
    lastCheckIn?: any;
    checkInCount?: number;
    orderId?: string;
}
