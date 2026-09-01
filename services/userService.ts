import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

export const isInvalidStudent = (rawName: string, role?: string, isParent?: boolean): boolean => {
    if (!rawName) return true;
    const clean = rawName.trim().toLowerCase();
    if (clean.length < 2) return true;

    // Role check
    const r = (role || '').toLowerCase();
    const excludedRoles = ['admin', 'director', 'developer', 'staff', 'trainer', 'coach', 'parent', 'manager'];
    if (excludedRoles.includes(r)) return true;
    if (isParent) return true;

    // Filter out group titles, schedules, locations
    const invalidKeywords = [
        'гр.', 'гр ', 'группа', 'тренер', 'расписание',
        'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс',
        'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье',
        'зал', 'манеж', 'абонемент'
    ];
    if (invalidKeywords.some(kw => clean.startsWith(kw) || clean === kw)) return true;

    // Filter out coaches, staff & test accounts
    const excludedNames = [
        'кубарь', 'якупов', 'пономарев', 'понамарев', 'глазунов', 'лебедева',
        'youtube', 'admin', 'test', 'тест', 'director', 'директор', 'sparta admin'
    ];
    if (excludedNames.some(name => clean.includes(name))) return true;

    // Filter out year ranges like 2015-2012
    if (/\b(201\d|202\d)\s*[-–,]\s*(201\d|202\d)\b/.test(clean)) return true;

    // Filter out time patterns like 19:00 - 20:00
    if (/\b\d{1,2}[:.]\d{2}\b/.test(clean)) return true;

    return false;
};

const get10Digits = (p?: string): string => {
    if (!p) return '';
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
};

export const getChildrenProfiles = async (parentIdOrIds: string | string[]) => {
    try {
        if (Array.isArray(parentIdOrIds)) {
            if (parentIdOrIds.length === 0) return [];
            const docs = await Promise.all(parentIdOrIds.map(id => getDoc(doc(db, 'users', id))));
            return docs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
        }
        const q = query(collection(db, 'users'), where('parentId', '==', parentIdOrIds));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error('Error fetching children profiles:', e);
        return [];
    }
};

export const findChildToLink = async (childName: string, phone?: string, excludeParentId?: string) => {
    try {
        const cleanPhone10 = get10Digits(phone);
        const cleanNameQuery = childName ? childName.trim().toLowerCase() : '';
        const nameRoot = cleanNameQuery.length > 5 ? cleanNameQuery.slice(0, 5) : cleanNameQuery;

        if (!cleanPhone10 && !cleanNameQuery) return [];

        const hasPhone = cleanPhone10.length >= 7;
        const hasName = cleanNameQuery.length >= 2;

        if (!hasPhone && !hasName) return [];

        // 1. Search in pending_students
        const pendingRef = collection(db, 'pending_students');
        const snapPending = await getDocs(pendingRef);
        const pendingDocs: any[] = [];

        snapPending.docs.forEach(d => {
            const data = d.data();
            if (data.status === 'linked' && data.assignedUid) return;

            const rawName = data.childFullName || `${data.childLastName || ''} ${data.childFirstName || ''}`.trim() || data.name || '';
            
            // Check if name is valid student name
            if (isInvalidStudent(rawName)) return;

            const pPhone10 = get10Digits(data.parentPhone || data.phone);
            const pChildFullName = rawName.toLowerCase();
            const pLastName = (data.childLastName || '').toLowerCase();
            const pFirstName = (data.childFirstName || '').toLowerCase();
            const pParentName = (data.parentName || '').toLowerCase();

            // Strict phone match: both must be >= 7 digits
            const phoneMatches = Boolean(
                hasPhone && pPhone10.length >= 7 && (
                    cleanPhone10 === pPhone10 ||
                    cleanPhone10.endsWith(pPhone10) ||
                    pPhone10.endsWith(cleanPhone10)
                )
            );

            // Name match
            const nameMatches = Boolean(
                hasName && (
                    pChildFullName.includes(cleanNameQuery) ||
                    pLastName.includes(cleanNameQuery) ||
                    pFirstName.includes(cleanNameQuery) ||
                    (nameRoot.length >= 4 && (pChildFullName.includes(nameRoot) || pParentName.includes(nameRoot)))
                )
            );

            if (phoneMatches || nameMatches) {
                pendingDocs.push({
                    id: d.id,
                    name: rawName,
                    age: data.childAge || data.age || 0,
                    type: 'pending',
                    groupId: data.groupId || '',
                    groupName: data.groupName || 'Группа Sparta',
                    coachName: data.coachName || '',
                    parentPhone: data.parentPhone || data.phone || '',
                    parentName: data.parentName || '',
                    score: (phoneMatches ? 2 : 0) + (nameMatches ? 3 : 0)
                });
            }
        });

        // 2. Search in users collection
        const usersRef = collection(db, 'users');
        const snapUsers = await getDocs(usersRef);
        const userDocs: any[] = [];

        snapUsers.docs.forEach(d => {
            if (excludeParentId && d.id === excludeParentId) return;

            const u = d.data();
            const uRole = (u.role || '').toLowerCase();

            // Exclude staff, admin, coach, parent
            if (isInvalidStudent(u.displayName || u.name || u.childName, uRole, u.isParent || (u.childrenIds && u.childrenIds.length > 0))) {
                return;
            }

            const rawName = u.childName || u.displayName || u.name || `${u.childLastName || ''} ${u.childFirstName || ''}`.trim();
            if (isInvalidStudent(rawName)) return;

            const uPhone10 = get10Digits(u.parentPhone || u.phone);
            const uChildPhone10 = get10Digits(u.childPhone);
            const uNameLower = rawName.toLowerCase();
            const uLastNameLower = (u.childLastName || '').toLowerCase();
            const uFirstNameLower = (u.childFirstName || '').toLowerCase();
            const uParentNameLower = (u.parentName || '').toLowerCase();

            const phoneMatches = Boolean(
                hasPhone && (
                    (uPhone10.length >= 7 && (cleanPhone10 === uPhone10 || cleanPhone10.endsWith(uPhone10) || uPhone10.endsWith(cleanPhone10))) ||
                    (uChildPhone10.length >= 7 && (cleanPhone10 === uChildPhone10 || cleanPhone10.endsWith(uChildPhone10) || uChildPhone10.endsWith(cleanPhone10)))
                )
            );

            const nameMatches = Boolean(
                hasName && (
                    uNameLower.includes(cleanNameQuery) ||
                    uLastNameLower.includes(cleanNameQuery) ||
                    uFirstNameLower.includes(cleanNameQuery) ||
                    (nameRoot.length >= 4 && (uNameLower.includes(nameRoot) || uParentNameLower.includes(nameRoot)))
                )
            );

            if (phoneMatches || nameMatches) {
                userDocs.push({
                    id: d.id,
                    name: rawName,
                    age: u.childAge || u.age || 0,
                    type: 'user',
                    groupId: u.groupId || '',
                    groupName: u.groupName || 'Группа Sparta',
                    coachName: u.coachName || '',
                    parentPhone: u.parentPhone || u.phone || '',
                    parentName: u.parentName || '',
                    score: (phoneMatches ? 2 : 0) + (nameMatches ? 3 : 0)
                });
            }
        });

        // Combine, sort by relevance score, deduplicate
        const combined = [...pendingDocs, ...userDocs].sort((a, b) => (b.score || 0) - (a.score || 0));
        const seenKeys = new Set();
        const results: any[] = [];

        combined.forEach(item => {
            const key = `${(item.name || '').trim().toLowerCase()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                results.push(item);
            }
        });

        return results;
    } catch (e) {
        console.error('Error finding child:', e);
        return [];
    }
};

export const linkParentToChild = async (parentId: string, childId: string) => {
    try {
        const childRef = doc(db, 'users', childId);
        await updateDoc(childRef, { parentId, updatedAt: serverTimestamp() });

        const parentRef = doc(db, 'users', parentId);
        await updateDoc(parentRef, { childrenIds: arrayUnion(childId), isLinked: true, updatedAt: serverTimestamp() });

        return { success: true };
    } catch (e) {
        console.error('Error linking parent to child:', e);
        return { success: false, error: e, message: 'Не удалось привязать спортсмена.' };
    }
};

export const linkParentToRegistryChild = async (parentId: string, pendingId: string, candidateName?: string) => {
    try {
        const pendingRef = doc(db, 'pending_students', pendingId);
        const pendingSnap = await getDoc(pendingRef);
        let pendingData: any = {};
        if (pendingSnap.exists()) {
            pendingData = pendingSnap.data();
        }

        // Get parent details
        const parentRef = doc(db, 'users', parentId);
        const parentSnap = await getDoc(parentRef);
        const parentData = parentSnap.exists() ? parentSnap.data() : {};

        // Create child profile in users
        const childRef = doc(collection(db, 'users'));
        const childId = childRef.id;

        const cleanFullName = pendingData.childFullName || candidateName || `${pendingData.childLastName || ''} ${pendingData.childFirstName || ''}`.trim() || 'Спортсмен Спарта';
        const kidPin = pendingData.kidPin || Math.floor(1000 + Math.random() * 9000).toString();

        const childPayload = {
            id: childId,
            uid: childId,
            parentId,
            role: 'user',
            status: 'active',
            displayName: cleanFullName,
            name: cleanFullName,
            childName: cleanFullName,
            childFirstName: pendingData.childFirstName || '',
            childLastName: pendingData.childLastName || '',
            childAge: pendingData.childAge || 0,
            groupId: pendingData.groupId || '',
            groupName: pendingData.groupName || 'Группа Sparta',
            coachName: pendingData.coachName || '',
            coachId: pendingData.coachId || null,
            parentPhone: parentData.phone || pendingData.parentPhone || '',
            parentName: parentData.displayName || parentData.parentName || pendingData.parentName || '',
            parentEmail: parentData.email || '',
            kidPin,
            rating: 75,
            skills: {
                dribbling: 70,
                speed: 75,
                passing: 70,
                shooting: 65,
                discipline: 85,
                teamwork: 80
            },
            badges: [
                { id: 'first_step', title: 'Первый шаг в Спарту', icon: '⚽', unlockedAt: new Date().toISOString() }
            ],
            achievements: [],
            subscription: null,
            hasActiveMembership: false,
            membershipExpires: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(childRef, childPayload);

        // Update parent doc
        await updateDoc(parentRef, {
            childrenIds: arrayUnion(childId),
            isLinked: true,
            updatedAt: serverTimestamp()
        });

        // Mark pending student as linked
        await updateDoc(pendingRef, {
            status: 'linked',
            assignedUid: childId,
            linkedUserId: childId,
            linkedAt: serverTimestamp()
        });

        return { success: true, childId };
    } catch (e) {
        console.error('Error linking parent to registry child:', e);
        return { success: false, error: e, message: 'Не удалось привязать из реестра.' };
    }
};

export const createAndLinkChild = async (
    parentId: string,
    childData: {
        childName: string;
        birthYear?: number;
        childAge?: number;
        branchId?: string;
        branchName?: string;
        cityName?: string;
        cityId?: string;
        groupId?: string;
        groupName?: string;
        coachName?: string;
    }
) => {
    try {
        const parentRef = doc(db, 'users', parentId);
        const parentSnap = await getDoc(parentRef);
        const parentData = parentSnap.exists() ? parentSnap.data() : {};

        const childRef = doc(collection(db, 'users'));
        const childId = childRef.id;

        const cleanName = childData.childName.trim();
        const birthYear = childData.birthYear || (childData.childAge ? 2026 - childData.childAge : 2018);
        const childAge = childData.childAge || (2026 - birthYear);
        const kidPin = Math.floor(1000 + Math.random() * 9000).toString();

        const childPayload = {
            id: childId,
            uid: childId,
            parentId,
            role: 'student',
            status: 'active',
            displayName: cleanName,
            name: cleanName,
            childName: cleanName,
            birthYear,
            childAge,
            cityId: childData.cityId || 'chelyabinsk',
            cityName: childData.cityName || 'Челябинск',
            branchId: childData.branchId || 'newton',
            branchName: childData.branchName || 'ОЦ «Ньютон»',
            groupId: childData.groupId || '',
            groupName: childData.groupName || `Группа ${birthYear} г.р.`,
            coachName: childData.coachName || 'Якупов Павел Валерьевич',
            parentPhone: parentData.phone || parentData.parentPhone || '',
            parentName: parentData.displayName || parentData.name || 'Родитель',
            parentEmail: parentData.email || '',
            kidPin,
            rating: 75,
            skills: {
                dribbling: 70,
                speed: 75,
                passing: 70,
                shooting: 65,
                discipline: 85,
                teamwork: 80
            },
            badges: [
                { id: 'first_step', title: 'Первый шаг в Спарту', icon: '⚽', unlockedAt: new Date().toISOString() }
            ],
            achievements: [],
            subscription: null,
            hasActiveMembership: false,
            membershipExpires: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(childRef, childPayload);

        // Update parent doc with childId in childrenIds
        await updateDoc(parentRef, {
            childrenIds: arrayUnion(childId),
            isLinked: true,
            updatedAt: serverTimestamp()
        });

        return { success: true, childId, child: childPayload };
    } catch (e: any) {
        console.error('Error creating and linking child:', e);
        return { success: false, error: e, message: e.message || 'Ошибка при создании профиля ребёнка.' };
    }
};

export const sendLinkingRequest = async (parentId: string, parentName: string, childId: string) => {
    try {
        await addDoc(collection(db, 'linking_requests'), {
            parentId,
            parentName,
            childId,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.error('Error sending linking request:', e);
        return { success: false, error: e, message: 'Не удалось отправить запрос.' };
    }
};

