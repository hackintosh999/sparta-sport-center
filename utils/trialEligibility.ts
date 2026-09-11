import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';

export type TrialIneligibilityReason =
    | 'already_requested_pending' // Заявка подана и ожидает звонка/рассмотрения
    | 'already_scheduled'         // Заявка одобрена, назначена дата первого занятия
    | 'already_attended'          // Пробная тренировка уже состоялась
    | 'already_student';          // Ребёнок уже числится среди учеников школы

export interface TrialEligibilityResult {
    eligible: boolean;
    reason?: TrialIneligibilityReason;
    message?: string;
    existingRecord?: any;
}

/**
 * Очищает телефон от скобок, пробелов, дефисов и приводит к единому формату РФ: 7XXXXXXXXXX (11 цифр)
 */
export function normalizePhone(rawPhone?: string | null): string {
    if (!rawPhone) return '';
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.slice(1);
    }
    if (digits.length === 10) {
        digits = '7' + digits;
    }
    return digits;
}

/**
 * Нормализует имя: удаляет пробелы по краям, двойные пробелы, переводит в нижний регистр, заменяет ё на е
 */
export function normalizeName(name?: string | null): string {
    if (!name) return '';
    return name
        .trim()
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ');
}

export interface CheckEligibilityParams {
    phone?: string;
    childName?: string;
    childLastName?: string;
    birthDate?: string;
    userId?: string;
}

/**
 * Комплексная проверка на повторную запись на бесплатное пробное занятие:
 * 1. Проверяет коллекцию 'requests' по номеру телефона (в каноническом и исходном виде).
 * 2. Проверяет коллекцию 'trials' по номеру телефона.
 * 3. Проверяет коллекцию 'users' на наличие действующего ученика с таким именем.
 * 4. Проверяет активные заявки текущего авторизованного пользователя.
 */
export async function checkTrialEligibility(params: CheckEligibilityParams): Promise<TrialEligibilityResult> {
    const rawPhone = (params.phone || '').trim();
    const cleanPhone = normalizePhone(rawPhone);
    const rawChildName = (params.childName || '').trim();
    const rawChildLastName = (params.childLastName || '').trim();
    const combinedChildName = `${rawChildLastName} ${rawChildName}`.trim() || rawChildName;
    const cleanChildName = normalizeName(combinedChildName);
    const userId = params.userId;

    // 1. Проверка по номеру телефона в requests
    if (cleanPhone.length >= 10) {
        try {
            const requestsRef = collection(db, 'requests');
            // Проверяем по исходному номеру
            const phoneQueries = [
                query(requestsRef, where('parentPhone', '==', rawPhone), limit(10)),
            ];

            // Если есть нормализованный номер, проверяем и его
            if (cleanPhone !== rawPhone) {
                phoneQueries.push(query(requestsRef, where('parentPhone', '==', cleanPhone), limit(10)));
                phoneQueries.push(query(requestsRef, where('phone', '==', cleanPhone), limit(10)));
                phoneQueries.push(query(requestsRef, where('phone', '==', rawPhone), limit(10)));
            }

            for (const q of phoneQueries) {
                const snap = await getDocs(q);
                for (const docSnap of snap.docs) {
                    const data = docSnap.data();
                    const status = (data.status || 'new').toLowerCase();
                    if (status === 'rejected' || status === 'cancelled') continue;

                    if (status === 'new' || status === 'pending') {
                        return {
                            eligible: false,
                            reason: 'already_requested_pending',
                            message: `Заявка для ${data.childName || 'ребёнка'} уже принята и ожидает звонка администратора! Мы свяжемся с вами в ближайшее время.`,
                            existingRecord: { id: docSnap.id, ...data }
                        };
                    }

                    if (status === 'approved' || status === 'confirmed' || status === 'scheduled') {
                        return {
                            eligible: false,
                            reason: 'already_scheduled',
                            message: `Вы уже записаны на тренировку в группу «${data.groupTitle || data.groupName || 'Спарта'}»! Ждём вас на занятии.`,
                            existingRecord: { id: docSnap.id, ...data }
                        };
                    }

                    if (status === 'attended' || status === 'completed' || status === 'enrolled') {
                        return {
                            eligible: false,
                            reason: 'already_attended',
                            message: `Ребёнок ${data.childName || ''} уже посещал пробное занятие. Бесплатное пробное занятие предоставляется 1 раз. Для продолжения тренировок оформите абонемент.`,
                            existingRecord: { id: docSnap.id, ...data }
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('checkTrialEligibility: error checking requests by phone', err);
        }

        // Проверка в коллекции trials
        try {
            const trialsRef = collection(db, 'trials');
            const qTrial = query(trialsRef, where('parentPhone', '==', rawPhone), limit(5));
            const snapTrial = await getDocs(qTrial);

            for (const docSnap of snapTrial.docs) {
                const data = docSnap.data();
                const status = (data.status || 'confirmed').toLowerCase();
                if (status === 'rejected' || status === 'cancelled') continue;

                if (status === 'confirmed' || status === 'scheduled') {
                    return {
                        eligible: false,
                        reason: 'already_scheduled',
                        message: `Запись на пробное занятие уже подтверждена в группу «${data.streamTitle || data.locationName || 'Спарта'}».`,
                        existingRecord: { id: docSnap.id, ...data }
                    };
                }

                if (status === 'attended' || status === 'completed') {
                    return {
                        eligible: false,
                        reason: 'already_attended',
                        message: `Пробная тренировка для ${data.childName || 'ребёнка'} уже состоялась. Вы можете приобрести клубный абонемент для дальнейших тренировок.`,
                        existingRecord: { id: docSnap.id, ...data }
                    };
                }
            }
        } catch (err) {
            console.warn('checkTrialEligibility: error checking trials by phone', err);
        }
    }

    // 2. Проверка по ФИО ребёнка в базе действующих учеников (users)
    if (cleanChildName.length >= 3) {
        try {
            const usersRef = collection(db, 'users');
            const qChild = query(usersRef, where('displayName', '==', combinedChildName), limit(5));
            const snapChild = await getDocs(qChild);

            for (const docSnap of snapChild.docs) {
                const data = docSnap.data();
                const role = data.role || 'user';
                if (role === 'student' || role === 'kid' || role === 'user') {
                    const normUser = normalizeName(data.displayName || data.name);
                    if (normUser === cleanChildName) {
                        return {
                            eligible: false,
                            reason: 'already_student',
                            message: `Спортсмен ${combinedChildName} уже числится в составе школы SPARTA! Повторная запись на пробное не требуется.`,
                            existingRecord: { id: docSnap.id, ...data }
                        };
                    }
                }
            }
        } catch (err) {
            console.warn('checkTrialEligibility: error checking users by child name', err);
        }
    }

    // 3. Проверка по userId (если родитель уже авторизован)
    if (userId) {
        try {
            const requestsRef = collection(db, 'requests');
            const qUserReq = query(requestsRef, where('userId', '==', userId), limit(5));
            const snapUserReq = await getDocs(qUserReq);

            for (const docSnap of snapUserReq.docs) {
                const data = docSnap.data();
                const status = (data.status || 'new').toLowerCase();
                if (status === 'rejected' || status === 'cancelled') continue;

                if (status === 'new' || status === 'pending') {
                    return {
                        eligible: false,
                        reason: 'already_requested_pending',
                        message: `У вас уже есть активная заявка на рассмотрении. Администратор скоро свяжется с вами!`,
                        existingRecord: { id: docSnap.id, ...data }
                    };
                }
            }
        } catch (err) {
            console.warn('checkTrialEligibility: error checking requests by userId', err);
        }
    }

    return { eligible: true };
}
