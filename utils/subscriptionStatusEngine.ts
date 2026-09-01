import { UserSubscription } from '../types/subscription';

export type SmartSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'NO_SUB' | 'OVERDUE' | 'FROZEN';

export interface SmartSubscriptionBadge {
    status: SmartSubscriptionStatus;
    label: string;
    badgeClass: string;
    dotClass: string;
    icon: 'Sparkles' | 'CheckCircle2' | 'CreditCard' | 'AlertCircle' | 'PauseCircle' | 'CircleOff';
    description: string;
}

export interface ProfileCompleteness {
    isComplete: boolean;
    missingFields: string[];
    hasParentPhone: boolean;
    hasBirthDate: boolean;
    hasMedCertificate: boolean;
    tooltipText: string;
}

/**
 * Calculates smart subscription status based on Firestore fields:
 * - TRIAL / NEW (🔵 Синий бейдж «Новичок»)
 * - ACTIVE (🟢 Зеленый бейдж «Оплачен»)
 * - NO_SUB (⚪ Серый бейдж «Нет абонемента»)
 * - OVERDUE / DEBT (🔴 Красный бейдж «Долг»)
 * - FROZEN (🟡 Желтый бейдж «Заморозка»)
 */
export function getSmartSubscriptionStatus(student: any): SmartSubscriptionBadge {
    if (!student) {
        return {
            status: 'NO_SUB',
            label: 'Нет абонемента',
            badgeClass: 'bg-zinc-700/25 text-zinc-400 border border-zinc-700/40',
            dotClass: 'bg-zinc-500',
            icon: 'CircleOff',
            description: 'Абонемент не приобретен'
        };
    }

    const sub = student.subscription || student.originalUser?.subscription || null;
    const isFrozen = Boolean(
        student.isFrozen ||
        student.subscriptionStatus === 'FROZEN' ||
        sub?.isFrozen ||
        sub?.status === 'FROZEN' ||
        sub?.status === 'frozen' ||
        student.status === 'frozen'
    );

    // 1. FROZEN (Заморозка)
    if (isFrozen) {
        return {
            status: 'FROZEN',
            label: 'Заморозка',
            badgeClass: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
            dotClass: 'bg-yellow-400',
            icon: 'PauseCircle',
            description: 'Абонемент временно приостановлен по болезни'
        };
    }

    // 2. TRIAL / NEW (Новичок)
    const isTrialType = student.type === 'trial' ||
        student.isTrial === true ||
        student.trialStatus === 'active' ||
        student.trialStatus === 'pending' ||
        student.status === 'trial';
    
    // Check creation date for new profile (< 14 days)
    let createdAtDate: Date | null = null;
    const rawCreated = student.createdAt || student.registeredAt || student.originalUser?.createdAt;
    if (rawCreated) {
        if (typeof rawCreated.toDate === 'function') {
            createdAtDate = rawCreated.toDate();
        } else if (rawCreated instanceof Date) {
            createdAtDate = rawCreated;
        } else if (typeof rawCreated === 'string' || typeof rawCreated === 'number') {
            createdAtDate = new Date(rawCreated);
        }
    }
    
    const now = new Date();
    const isUnder14Days = createdAtDate ? (now.getTime() - createdAtDate.getTime()) <= 14 * 24 * 60 * 60 * 1000 : false;
    const hasBoughtSubscription = Boolean(sub && (sub.id || sub.planId || sub.title || sub.totalSessions));

    if ((isTrialType || (isUnder14Days && !hasBoughtSubscription)) && !hasBoughtSubscription && student.paymentStatus !== 'paid') {
        return {
            status: 'TRIAL',
            label: 'Новичок',
            badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
            dotClass: 'bg-blue-400',
            icon: 'Sparkles',
            description: 'Пробный период или новый ученик (до 14 дней)'
        };
    }

    // Check expiration date and remaining sessions
    let expiresAtDate: Date | null = null;
    const rawExpires = sub?.expiresAt || student.membershipExpires || student.paymentDate;
    if (rawExpires) {
        if (typeof rawExpires.toDate === 'function') {
            expiresAtDate = rawExpires.toDate();
        } else if (rawExpires instanceof Date) {
            expiresAtDate = rawExpires;
        } else if (typeof rawExpires === 'string' || typeof rawExpires === 'number') {
            expiresAtDate = new Date(rawExpires);
        }
    }

    const remainingSessions = typeof sub?.remainingSessions === 'number'
        ? sub.remainingSessions
        : (typeof student.remainingSessions === 'number' ? student.remainingSessions : null);

    const isExpiredOver5Days = expiresAtDate
        ? (now.getTime() - expiresAtDate.getTime()) > 5 * 24 * 60 * 60 * 1000
        : false;

    // 3. OVERDUE / DEBT (Долг)
    const isExplicitDebt = student.paymentStatus === 'due' ||
        student.paymentStatus === 'unpaid' ||
        student.isOverdue === true ||
        (typeof student.debtAmount === 'number' && student.debtAmount > 0);

    if (isExplicitDebt || (isExpiredOver5Days && remainingSessions !== null && remainingSessions <= 0)) {
        return {
            status: 'OVERDUE',
            label: 'Долг',
            badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
            dotClass: 'bg-red-400',
            icon: 'AlertCircle',
            description: 'Просрочка оплаты или истекший абонемент'
        };
    }

    // 4. ACTIVE (Оплачен)
    const isSubActive = (remainingSessions === null || remainingSessions > 0) && (!expiresAtDate || expiresAtDate >= now);
    if (student.paymentStatus === 'paid' || (hasBoughtSubscription && isSubActive)) {
        return {
            status: 'ACTIVE',
            label: 'Оплачен',
            badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
            dotClass: 'bg-emerald-400',
            icon: 'CheckCircle2',
            description: 'Действующий оплаченный абонемент'
        };
    }

    // 5. NO_SUB (Нет абонемента)
    return {
        status: 'NO_SUB',
        label: 'Нет абонемента',
        badgeClass: 'bg-zinc-700/25 text-zinc-300 border border-zinc-700/40',
        dotClass: 'bg-zinc-400',
        icon: 'CreditCard',
        description: 'Пробный период завершен, абонемент не приобретен'
    };
}

/**
 * Checks student profile completeness for key required fields:
 * - Parent Phone
 * - Birth date / age
 * - Medical certificate clearance
 */
export function checkProfileCompleteness(student: any): ProfileCompleteness {
    if (!student) {
        return {
            isComplete: false,
            missingFields: ['Не указаны данные спортсмена'],
            hasParentPhone: false,
            hasBirthDate: false,
            hasMedCertificate: false,
            tooltipText: 'Данные профиля отсутствуют'
        };
    }

    const missing: string[] = [];

    // 1. Parent Phone
    const phone = student.parentPhone || student.phone || student.originalUser?.parentPhone || student.originalUser?.phone;
    const cleanDigits = phone ? String(phone).replace(/\D/g, '') : '';
    const hasParentPhone = cleanDigits.length >= 10;
    if (!hasParentPhone) {
        missing.push('Не указан телефон родителя');
    }

    // 2. Birth date / year
    const hasBirthDate = Boolean(
        student.birthDate ||
        student.birthYear ||
        student.childBirthYear ||
        student.childBirthDate ||
        student.dob ||
        student.childAge ||
        student.age ||
        student.originalUser?.birthDate ||
        student.originalUser?.birthYear ||
        student.originalUser?.childBirthYear
    );
    if (!hasBirthDate) {
        missing.push('Не указана дата рождения');
    }

    // 3. Medical certificate clearance
    const hasMedCertificate = Boolean(
        student.medCertificate ||
        student.medicalCertificate ||
        student.medicalNoteUrl ||
        student.medicalClearance ||
        student.hasMedicalCertificate ||
        student.medCertificateStatus === 'valid' ||
        student.originalUser?.medCertificate ||
        student.originalUser?.medicalCertificate
    );
    if (!hasMedCertificate) {
        missing.push('Нет действующей медсправки');
    }

    return {
        isComplete: missing.length === 0,
        missingFields: missing,
        hasParentPhone,
        hasBirthDate,
        hasMedCertificate,
        tooltipText: missing.length > 0 ? `Не заполнено: ${missing.join(', ')}` : 'Профиль полностью заполнен'
    };
}
