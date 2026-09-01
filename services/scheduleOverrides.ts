import { 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp, 
    updateDoc, 
    Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface ScheduleOverride {
    id?: string;
    groupId: string;
    groupName: string;
    coachName: string;
    date: string; // YYYY-MM-DD
    status: 'cancelled' | 'rescheduled' | 'replacement';
    title: string;
    reason: string;
    newTime?: string;
    replacementCoach?: string;
    makeupDate?: string;
    extendSubscription?: boolean;
    createdAt?: any;
    createdBy?: string;
}

/**
 * Creates a schedule override (cancellation, time change, or coach replacement)
 * Automatically extends affected student subscriptions by +1 day if requested,
 * and distributes notification alerts to parents.
 */
export const createScheduleOverride = async (override: Omit<ScheduleOverride, 'id' | 'createdAt'>): Promise<string> => {
    try {
        // 1. Add override document to Firestore
        const docRef = await addDoc(collection(db, 'schedule_overrides'), {
            ...override,
            createdAt: serverTimestamp()
        });

        // 2. Format human-friendly notification text
        let notifTitle = '⚡ Изменение в расписании';
        let notifMessage = '';

        if (override.status === 'cancelled') {
            notifTitle = `🚫 Тренировка отменена (${override.date})`;
            notifMessage = `Занятие группы "${override.groupName}" на ${override.date} отменено. Причина: ${override.reason}. Занятие сохранено на балансе вашего абонемента!`;
        } else if (override.status === 'rescheduled') {
            notifTitle = `⏰ Перенос времени (${override.date})`;
            notifMessage = `Тренировка группы "${override.groupName}" ${override.date} состоится в новое время: ${override.newTime}. Причина: ${override.reason}.`;
        } else if (override.status === 'replacement') {
            notifTitle = `🔄 Замена тренера (${override.date})`;
            notifMessage = `Тренировку группы "${override.groupName}" ${override.date} проведет тренер ${override.replacementCoach}.`;
        }

        // 3. Find all students belonging to this group
        const usersRef = collection(db, 'users');
        const qStudents = query(usersRef, where('role', '==', 'user'));
        const studentsSnap = await getDocs(qStudents);

        const targetStudents: any[] = [];
        studentsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const sGroup = (data.groupName || data.groupId || '').toLowerCase();
            const targetGroup = (override.groupName || override.groupId || '').toLowerCase();

            // Match by ID or matching group name tokens
            if (
                data.groupId === override.groupId ||
                (targetGroup && sGroup.includes(targetGroup.slice(0, 8))) ||
                (override.groupId && sGroup.includes(override.groupId.toLowerCase()))
            ) {
                targetStudents.push({ id: docSnap.id, ...data });
            }
        });

        // 4. If training was cancelled and extendSubscription is checked -> extend subscriptions by 1 day
        if (override.status === 'cancelled' && override.extendSubscription) {
            for (const student of targetStudents) {
                if (student.subscription?.expiresAt) {
                    const currentExpSeconds = student.subscription.expiresAt.seconds || Math.floor(new Date(student.subscription.expiresAt).getTime() / 1000);
                    const newExpTimestamp = Timestamp.fromMillis((currentExpSeconds + 86400) * 1000);

                    await updateDoc(doc(db, 'users', student.id), {
                        'subscription.expiresAt': newExpTimestamp,
                        'subscription.extendedReason': `Авто-продление из-за отмены тренировки ${override.date}`
                    }).catch(err => console.error(`Error extending subscription for student ${student.id}:`, err));
                }
            }
        }

        // 5. Send notification to all linked parents
        const parentIdsToNotify = new Set<string>();
        for (const student of targetStudents) {
            if (student.parentId) {
                parentIdsToNotify.add(student.parentId);
            }
        }

        for (const parentId of parentIdsToNotify) {
            await addDoc(collection(db, 'notifications'), {
                userId: parentId,
                title: notifTitle,
                message: notifMessage,
                type: 'schedule_alert',
                status: 'unread',
                createdAt: serverTimestamp(),
                overrideId: docRef.id,
                date: override.date
            }).catch(err => console.error(`Error sending notification to parent ${parentId}:`, err));
        }

        // Also add to global broadcasts feed
        await addDoc(collection(db, 'broadcasts'), {
            title: notifTitle,
            message: notifMessage,
            type: override.status === 'cancelled' ? 'alert' : 'info',
            targetGroup: override.groupName,
            createdAt: serverTimestamp(),
            author: override.createdBy || 'Администрация Sparta'
        }).catch(() => {});

        return docRef.id;
    } catch (error) {
        console.error('Error in createScheduleOverride:', error);
        throw error;
    }
};

/**
 * Removes a schedule override and restores standard schedule
 */
export const deleteScheduleOverride = async (overrideId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'schedule_overrides', overrideId));
    } catch (error) {
        console.error('Error deleting schedule override:', error);
        throw error;
    }
};
