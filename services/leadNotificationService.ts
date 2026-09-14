import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface LeadNotificationData {
    childName?: string;
    childAge?: string | number;
    birthDate?: string;
    parentName?: string;
    phone?: string;
    email?: string;
    programType?: string;
    location?: string;
    groupTitle?: string;
    schedule?: string;
    comment?: string;
    requestId?: string;
    source?: string;
}

const DIRECTOR_EMAIL = 'bugrova.k@bk.ru';
const ADMIN_EMAIL = 'larisa.p2000@mail.ru';

/**
 * Отправляет уведомление о новой заявке:
 * 1. Фиксирует уведомление в базе Firestore (для отображения на сайте в ЛК директора и администратора)
 * 2. Вызывает API для отправки брендированного email на адреса:
 *    - bugrova.k@bk.ru (Директор)
 *    - larisa.p2000@mail.ru (Администратор)
 */
export async function notifyNewLead(lead: LeadNotificationData): Promise<void> {
    const childTitle = lead.childName || lead.parentName || 'Новый клиент';
    const cleanPhone = (lead.phone || '').trim();

    // 1. Создаем уведомление в Firestore notifications для сайта
    try {
        await addDoc(collection(db, 'notifications'), {
            title: `⚡ Новая заявка: ${childTitle}`,
            message: `${lead.programType || 'Заявка с сайта'}. Телефон: ${cleanPhone || 'не указан'}.${lead.location ? ` Зал: ${lead.location}.` : ''}${lead.groupTitle ? ` Группа: ${lead.groupTitle}.` : ''}`,
            type: 'new_lead',
            targetEmails: [DIRECTOR_EMAIL, ADMIN_EMAIL],
            targetRoles: ['admin', 'director'],
            isRead: false,
            createdAt: serverTimestamp(),
            phone: cleanPhone,
            childName: lead.childName || '',
            parentName: lead.parentName || '',
            programType: lead.programType || 'Пробная тренировка',
            location: lead.location || '',
            requestId: lead.requestId || ''
        });
    } catch (firestoreError) {
        console.warn('[LEAD NOTIFICATION] Firestore notification save error:', firestoreError);
    }

    // 2. Отправляем email на почту директора и администратора через /api/notify-lead
    try {
        const response = await fetch('/api/notify-lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...lead,
                source: lead.source || 'Сайт SPARTA (онлайн-заявка)'
            })
        });

        if (!response.ok) {
            console.warn(`[LEAD NOTIFICATION] API responded with status ${response.status}`);
        } else {
            const data = await response.json().catch(() => null);
            console.log('[LEAD NOTIFICATION] Dispatch response:', data);
        }
    } catch (apiError) {
        console.warn('[LEAD NOTIFICATION] Email API call error:', apiError);
    }
}
