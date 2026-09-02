import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { normalizePhoneNumber } from './studentLinking';

export interface KnownCoachConfig {
    fullName: string;
    shortName: string;
    role: string;
    phonePatterns: string[];
    emails: string[];
    image: string;
}

export const KNOWN_COACHES: KnownCoachConfig[] = [
    {
        fullName: 'Пономарев Сергей Александрович',
        shortName: 'Пономарев',
        role: 'Старший тренер по футболу',
        phonePatterns: ['732543234', '7732543234', '9001112233'],
        emails: ['sergei123@gmail.com', 'ponomarev@sparta.ru'],
        image: '/sergey-ponomarev.png'
    },
    {
        fullName: 'Кубарь Сергей Игоревич',
        shortName: 'Кубарь',
        role: 'Тренер по футболу',
        phonePatterns: ['9511234567'],
        emails: ['sergejkubar831@gmail.com', 'kubar@sparta.ru'],
        image: '/sergey-kubar-gold.png'
    },
    {
        fullName: 'Якупов Павел Валерьевич',
        shortName: 'Якупов',
        role: 'Главный тренер (Категория UEFA)',
        phonePatterns: ['9000000000', '9000000001'],
        emails: ['yakupov.pavel@sparta.ru', 'yakupov@sparta.ru'],
        image: '/pavel-yakupov-gold.png'
    },
    {
        fullName: 'Глазунов Антон',
        shortName: 'Глазунов',
        role: 'Тренер по киле',
        phonePatterns: [],
        emails: ['glazunov@sparta.ru'],
        image: '/anton-glazunov.png'
    }
];

/**
 * Checks whether the given phone, email or name belongs to a Sparta Coach,
 * assigns coach permissions, binds corresponding groups and updates chats.
 */
export const checkAndLinkCoachAccount = async (
    uid: string,
    phone?: string | null,
    email?: string | null,
    displayName?: string | null
): Promise<{ isCoach: boolean; coachName?: string; linkedGroupsCount: number }> => {
    try {
        const cleanPhone = normalizePhoneNumber(phone || '');
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanName = (displayName || '').trim().toLowerCase();

        // 1. Check matching in KNOWN_COACHES registry
        let matchedConfig = KNOWN_COACHES.find(c => {
            const phoneMatch = cleanPhone && c.phonePatterns.some(p => cleanPhone.includes(p) || p.includes(cleanPhone));
            const emailMatch = cleanEmail && c.emails.some(e => e.toLowerCase() === cleanEmail);
            const nameMatch = cleanName && cleanName.length > 3 && c.fullName.toLowerCase().includes(cleanName);
            return phoneMatch || emailMatch || nameMatch;
        });

        // 2. Fallback: Search in existing `coaches` collection
        if (!matchedConfig) {
            const coachesSnap = await getDocs(collection(db, 'coaches'));
            for (const cDoc of coachesSnap.docs) {
                const c = cDoc.data();
                const cName = (c.name || '').toLowerCase();
                const cPhone = normalizePhoneNumber(c.phone || '');
                if ((cleanPhone && cPhone && (cleanPhone === cPhone || cleanPhone.endsWith(cPhone))) ||
                    (cleanName && cleanName.length > 3 && cName.includes(cleanName))) {
                    matchedConfig = {
                        fullName: c.name,
                        shortName: c.name.split(' ')[0] || c.name,
                        role: c.role || 'Тренер по футболу',
                        phonePatterns: cPhone ? [cPhone] : [],
                        emails: [],
                        image: c.image || '/sergey-ponomarev.png'
                    };
                    break;
                }
            }
        }

        // 3. Fallback: Search in `users` collection for staff accounts
        if (!matchedConfig) {
            const staffSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['coach', 'trainer'])));
            for (const sDoc of staffSnap.docs) {
                const s = sDoc.data();
                const sPhone = normalizePhoneNumber(s.phone || s.parentPhone || '');
                const sEmail = (s.email || s.tempEmail || '').toLowerCase();
                if ((cleanPhone && sPhone && cleanPhone === sPhone) || (cleanEmail && sEmail === cleanEmail)) {
                    matchedConfig = {
                        fullName: s.displayName || s.name || 'Тренер Sparta',
                        shortName: (s.displayName || s.name || '').split(' ')[0] || 'Тренер',
                        role: 'Тренер по футболу',
                        phonePatterns: sPhone ? [sPhone] : [],
                        emails: sEmail ? [sEmail] : [],
                        image: s.photoURL || s.image || '/sergey-ponomarev.png'
                    };
                    break;
                }
            }
        }

        if (!matchedConfig) {
            return { isCoach: false, linkedGroupsCount: 0 };
        }

        // --- Apply Coach Role to User Document ---
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            role: 'coach',
            isStaff: true,
            isAdmin: false,
            coachId: uid,
            displayName: matchedConfig.fullName,
            name: matchedConfig.fullName,
            updatedAt: serverTimestamp()
        }).catch(async () => {
            // Document might not exist yet if called pre-creation
        });

        // --- Automatically Link Groups in `groups` collection ---
        const groupsSnap = await getDocs(collection(db, 'groups'));
        let linkedGroupsCount = 0;
        const targetGroupIds: string[] = [];

        for (const gDoc of groupsSnap.docs) {
            const g = gDoc.data();
            const gCoachName = (g.coachName || '').toLowerCase();
            const gName = (g.name || '').toLowerCase();
            const shortLower = matchedConfig.shortName.toLowerCase();

            const isMyGroup = gCoachName.includes(shortLower) || gName.includes(shortLower) || g.coachId === uid;
            if (isMyGroup) {
                targetGroupIds.push(gDoc.id);
                linkedGroupsCount++;
                await updateDoc(doc(db, 'groups', gDoc.id), {
                    coachId: uid,
                    coachName: matchedConfig.fullName,
                    coachImage: matchedConfig.image,
                    updatedAt: serverTimestamp()
                });
            }
        }

        // --- Sync Group Chats in `chats` collection ---
        if (targetGroupIds.length > 0) {
            for (const gId of targetGroupIds) {
                const qChats = query(collection(db, 'chats'), where('groupId', '==', gId));
                const cSnap = await getDocs(qChats);
                for (const cDoc of cSnap.docs) {
                    await updateDoc(doc(db, 'chats', cDoc.id), {
                        coachId: uid,
                        coachName: matchedConfig.fullName,
                        participants: arrayUnion(uid),
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        console.log(`✅ Coach auto-linked: ${matchedConfig.fullName} (${uid}) to ${linkedGroupsCount} groups`);
        return {
            isCoach: true,
            coachName: matchedConfig.fullName,
            linkedGroupsCount
        };

    } catch (err) {
        console.error('Error in checkAndLinkCoachAccount:', err);
        return { isCoach: false, linkedGroupsCount: 0 };
    }
};
