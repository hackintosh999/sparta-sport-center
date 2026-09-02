export type UserRole = 'user' | 'admin' | 'director' | 'coach' | 'parent' | 'trainer' | 'developer' | 'dev';
export type UserStatus = 'active' | 'banned' | 'deleted' | 'inactive' | 'linked' | 'pending';

export interface UserItem {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    name?: string;
    phone?: string;
    childPhone?: string;
    parentName?: string;
    parentFullName?: string;
    parent_name?: string;
    guardianName?: string;
    parentInfo?: any;
    parentPhone?: string;
    parentEmail?: string;
    childName?: string;
    childFullName?: string;
    childAge?: number | string;
    childGender?: 'male' | 'female';
    balance?: number;
    bonuses?: number;
    groupId?: string;
    createdAt?: any;
    updatedAt?: any;
    avatarUrl?: string;
    photoUrl?: string;
    notes?: string;
    displayName?: string;
    assignedUid?: string;
    originalName?: string;
    targetGroupId?: string;
    importedAt?: any;
    childFirstName?: string;
    childLastName?: string;
    firstName?: string;
    lastName?: string;
    childBirthYear?: number | string;
    isPendingRegistration?: boolean;
    lastActive?: any;
    subscription?: any;
    walletBalance?: number;
    totalSpent?: number;
    verification?: any;
    adminNotes?: string;
    achievements?: any[];
    ban?: any;
    claimed?: boolean;
    isClaimed?: boolean;
    linkedParentId?: string;
    linkedChildId?: string;
    isStaff?: boolean;
    isAdmin?: boolean;
    tempEmail?: string;
    tempPassword?: string;
    isTemporaryCredentials?: boolean;
    kidPin?: string;
    parentId?: string;
    childrenIds?: string[];
    coachNotes?: string;
    coachNotesList?: CoachNote[];
    medicalDoc?: {
        status: 'valid' | 'expiring' | 'expired' | 'missing';
        validUntil?: string;       // Дата окончания допуска (YYYY-MM-DD)
        photoUrl?: string;         // Ссылка на скан/фото справки в Supabase Storage
        notes?: string;            // Ограничения: группа здоровья, противопоказания
        updatedAt?: any;
    };
}

export interface CoachNote {
    id: string;
    text: string;
    createdAt: string;
    authorName: string;
    authorId: string;
}

export type User = UserItem;

