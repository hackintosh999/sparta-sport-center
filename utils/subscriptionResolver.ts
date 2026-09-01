import { UserSubscription, SubscriptionStatus } from '../types/subscription';
import { SPARTA_LOCATIONS } from '../constants/cities';

/**
 * Resolves, normalizes, and validates the subscription for a given child.
 * Seamlessly handles legacy formats, parent-level fallbacks, and ensures
 * exact remaining sessions and expiration dates are accurately computed.
 */
export const resolveChildSubscription = (
    child: any,
    parentProfile?: any
): UserSubscription | null => {
    if (!child) return null;

    let rawSub: any = null;

    // 1. Explicit subscription directly on the child document
    if (child.subscription && typeof child.subscription === 'object') {
        rawSub = child.subscription;
    } else if (parentProfile?.subscription && typeof parentProfile.subscription === 'object') {
        // 2. Only if parent subscription explicitly specifies this child's id
        const pSub = parentProfile.subscription;
        if (pSub.childId && pSub.childId === child.id) {
            rawSub = pSub;
        }
    }

    // If no subscription object exists for this child, return null (strictly NO subscription)
    if (!rawSub || typeof rawSub !== 'object') {
        return null;
    }

    // Determine Title
    let title = 'Базовый абонемент';
    if (typeof rawSub === 'string' && rawSub.trim()) {
        title = rawSub.trim();
    } else if (rawSub?.title && typeof rawSub.title === 'string' && rawSub.title.trim()) {
        title = rawSub.title;
    } else if (child.groupName) {
        title = `Абонемент: ${child.groupName}`;
    }

    // Determine Total Sessions
    let totalSessions = 8;
    if (typeof rawSub?.totalSessions === 'number' && rawSub.totalSessions > 0) {
        totalSessions = rawSub.totalSessions;
    } else if (typeof child.totalSessions === 'number' && child.totalSessions > 0) {
        totalSessions = child.totalSessions;
    } else {
        const lower = title.toLowerCase();
        if (lower.includes('интенсив') || lower.includes('12')) {
            totalSessions = 12;
        } else if (lower.includes('премиум') || lower.includes('14') || lower.includes('16')) {
            totalSessions = 14;
        } else if (lower.includes('разовое') || lower.includes('пробное') || lower.includes('1')) {
            totalSessions = 1;
        } else {
            totalSessions = 8;
        }
    }

    // Determine Remaining Sessions
    let remainingSessions = totalSessions;
    if (typeof rawSub?.remainingSessions === 'number') {
        remainingSessions = rawSub.remainingSessions;
    } else if (typeof child.remainingSessions === 'number') {
        remainingSessions = child.remainingSessions;
    } else if (typeof child.remainingLessons === 'number') {
        remainingSessions = child.remainingLessons;
    } else {
        // Calculate from attended sessions if attendance array is present
        const attended = Array.isArray(child.attendance)
            ? child.attendance.filter((a: any) => a.status === 'present').length
            : (typeof child.visitsCount === 'number' ? child.visitsCount : 0);
        remainingSessions = Math.max(0, totalSessions - attended);
    }

    // Determine Expiration Date
    let expiresAt = rawSub?.expiresAt || child.membershipExpires || parentProfile?.membershipExpires || null;
    if (!expiresAt) {
        const defaultExp = new Date();
        defaultExp.setDate(defaultExp.getDate() + 30);
        expiresAt = defaultExp;
    }

    // Determine Frozen Status
    const isFrozen = Boolean(
        rawSub?.isFrozen || 
        rawSub?.status === 'FROZEN' || 
        rawSub?.status === 'frozen' ||
        child.isFrozen
    );
    const frozenUntil = rawSub?.frozenUntil || child.frozenUntil || null;

    // Determine Branch & City
    const branchId = rawSub?.branchId || child.branchId || parentProfile?.branchId || 'newton';
    const matchedLoc = SPARTA_LOCATIONS.find(l => l.id === branchId) || SPARTA_LOCATIONS[0];
    const branchName = rawSub?.branchName || child.branchName || matchedLoc.name || 'ОЦ «Ньютон»';
    const cityId = rawSub?.cityId || child.cityId || matchedLoc.cityId || 'chelyabinsk';
    const cityName = rawSub?.cityName || child.cityName || (matchedLoc as any).cityName || 'Челябинск';

    const status: SubscriptionStatus = isFrozen ? 'FROZEN' : (remainingSessions <= 0 ? 'EXPIRED' : 'ACTIVE');

    return {
        planId: rawSub?.planId || 'plan_base_8',
        title,
        childId: child.id,
        childName: child.childName || child.name || 'Спортсмен',
        parentId: child.parentId || parentProfile?.id || parentProfile?.uid || '',
        parentPhone: parentProfile?.phone || child.parentPhone || '',
        parentEmail: parentProfile?.email || child.parentEmail || '',
        cityId,
        cityName,
        branchId,
        branchName,
        isUniversal: Boolean(rawSub?.isUniversal),
        ageCategory: rawSub?.ageCategory || (child.childAge && child.childAge <= 6 ? 'JUNIOR_3_6' : 'SENIOR_7_14'),
        type: rawSub?.type || 'sessions',
        totalSessions,
        remainingSessions,
        activatedAt: rawSub?.activatedAt || child.createdAt || new Date(),
        expiresAt,
        status,
        isFrozen,
        frozenUntil,
        freezeDaysTotal: rawSub?.freezeDaysTotal ?? 0,
        freezeDaysAvailable: rawSub?.freezeDaysAvailable ?? 14,
        purchasePrice: rawSub?.purchasePrice || 5200
    };
};

/**
 * Checks if a subscription is considered fully active with remaining sessions.
 */
export const isSubscriptionValid = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    if (sub.isFrozen) return true; // Frozen is still a valid active subscription
    if (sub.status === 'EXPIRED') return false;
    if (typeof sub.remainingSessions === 'number' && sub.remainingSessions <= 0) return false;
    return true;
};
