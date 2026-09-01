import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField, limit } from 'firebase/firestore';
import { SPARTA_SCHEDULE } from '../constants/spartaSchedule';

export const normalizePhoneNumber = (phoneStr?: string): string => {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    if (!digits) return '';
    // If 11 digits starting with 7 or 8, get 10 digits
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
        return digits.slice(1);
    }
    if (digits.length >= 10) {
        return digits.slice(-10);
    }
    return digits;
};

export const resolveSpartaCoachAndGroup = (
    rawGroup?: string,
    rawCoach?: string,
    birthYear?: number,
    age?: number
): { coachName: string; groupName: string } => {
    let cleanCoach = (rawCoach || '').trim();
    let cleanGroup = (rawGroup || '').trim();

    const isCoachGeneric = !cleanCoach || 
        cleanCoach === 'Тренер Sparta' || 
        cleanCoach === 'Тренер' || 
        cleanCoach === 'Спарта' || 
        cleanCoach.toLowerCase() === 'тренер спарта' ||
        cleanCoach.toLowerCase() === 'тренер';

    if (isCoachGeneric) {
        const lowerGroup = cleanGroup.toLowerCase();
        if (lowerGroup.includes('якупов') || lowerGroup.includes('павел')) {
            cleanCoach = 'Якупов Павел Валерьевич';
        } else if (lowerGroup.includes('кубарь') || lowerGroup.includes('сергей')) {
            cleanCoach = 'Кубарь Сергей Игоревич';
        } else if (lowerGroup.includes('пономарев') || lowerGroup.includes('пономарёв')) {
            cleanCoach = 'Пономарев Сергей Александрович';
        } else if (lowerGroup.includes('меньшиков') || lowerGroup.includes('антон')) {
            cleanCoach = 'Меньшиков Антон Александрович';
        } else if (lowerGroup.includes('лебедев') || lowerGroup.includes('александр')) {
            cleanCoach = 'Лебедев Александр Сергеевич';
        } else if (birthYear || age) {
            const targetYear = birthYear || (age ? (2026 - age) : 2017);
            const slot = SPARTA_SCHEDULE.find(s => s.birthYears.includes(targetYear));
            cleanCoach = slot ? slot.coachName : 'Якупов Павел Валерьевич';
        } else {
            cleanCoach = 'Якупов Павел Валерьевич';
        }
    }

    // Clean up group name formatting if it contained the coach name
    if (cleanGroup.includes('Якупов') || cleanGroup.includes('Пономарев') || cleanGroup.includes('Кубарь') || cleanGroup.includes('Меньшиков') || cleanGroup.includes('Лебедев')) {
        const matchYears = cleanGroup.match(/(\d{4}[-–]\d{4}(?:[-–]\d{4})?)/);
        if (matchYears) {
            cleanGroup = `Группа ${matchYears[1]} г.р.`;
        } else {
            cleanGroup = cleanGroup.replace(/Якупов.*|Пономарев.*|Кубарь.*|Меньшиков.*|Лебедев.*/i, '').trim() || 'Основная группа';
        }
    }

    const calcYear = birthYear || (age ? (2026 - age) : undefined);
    const calcAge = age || (birthYear ? (2026 - birthYear) : undefined);

    if (calcAge !== undefined && calcAge <= 6) {
        if (!cleanGroup || cleanGroup === 'Основная группа' || cleanGroup === 'Группа Sparta' || (!cleanGroup.includes(String(calcYear)) && (cleanGroup.includes('2016') || cleanGroup.includes('2017') || cleanGroup.includes('2018')))) {
            cleanGroup = calcYear ? `Младшая группа (${calcYear} г.р.)` : 'Младшая группа (3–6 лет)';
        }
    } else if (calcYear && (!cleanGroup || cleanGroup === 'Основная группа' || cleanGroup === 'Группа Sparta')) {
        cleanGroup = `Группа ${calcYear} г.р.`;
    }

    return {
        coachName: cleanCoach,
        groupName: cleanGroup || 'Основная группа'
    };
};


export interface ExistingStudentResult {
    found: boolean;
    student?: {
        id: string;
        name: string;
        childFirstName?: string;
        childLastName?: string;
        childAge?: number;
        groupId?: string;
        groupName?: string;
        coachName?: string;
        coachId?: string;
        parentPhone?: string;
        parentName?: string;
        kidPin?: string;
        source: 'users' | 'trials' | 'requests' | 'pending' | 'registry';
    };
}

/**
 * Pre-checks whether an athlete or parent already exists in Sparta's records
 */
export const findExistingSpartaStudent = async (
    phone?: string,
    childName?: string,
    email?: string,
    parentName?: string
): Promise<ExistingStudentResult> => {
    try {
        const cleanPhone = normalizePhoneNumber(phone);
        const cleanName = (childName || '').trim().toLowerCase();
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanParent = (parentName || '').trim().toLowerCase();

        if (!cleanPhone && !cleanName && !cleanEmail && !cleanParent) {
            return { found: false };
        }

        const isInvalidName = (name: string) => {
            if (!name) return true;
            const clean = name.trim().toLowerCase();
            if (clean.length < 2) return true;
            const invalidKeywords = [
                'гр.', 'гр ', 'группа', 'тренер', 'расписание',
                'пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс',
                'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье',
                'зал', 'манеж', 'абонемент'
            ];
            if (invalidKeywords.some(kw => clean.startsWith(kw) || clean === kw)) return true;
            if (/\b(201\d|202\d)\s*[-–,]\s*(201\d|202\d)\b/.test(clean)) return true;
            if (/\b\d{1,2}[:.]\d{2}\b/.test(clean)) return true;
            return false;
        };

        // 1. Search in `pending_students` (registry of imported and registered kids)
        const pendingSnap = await getDocs(collection(db, 'pending_students'));
        for (const d of pendingSnap.docs) {
            const p = d.data();
            if (p.status === 'linked' && p.assignedUid) continue;

            const rawName = p.childFullName || p.childName || `${p.childLastName || ''} ${p.childFirstName || ''}`.trim() || '';
            if (isInvalidName(rawName)) continue;

            const cleanPhoneDigits = normalizePhoneNumber(p.parentPhone || p.phone);
            const pChildName = rawName.toLowerCase();
            const pParentName = (p.parentName || '').trim().toLowerCase();
            const pLastName = (p.childLastName || '').trim().toLowerCase();
            const nameRoot = cleanName.length > 4 ? cleanName.slice(0, 4) : cleanName;
            const parentRoot = cleanParent.length > 4 ? cleanParent.slice(0, 4) : cleanParent;

            const phoneMatches = Boolean(cleanPhone && cleanPhoneDigits && (cleanPhoneDigits === cleanPhone || cleanPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(cleanPhoneDigits)));
            const nameMatches = Boolean(cleanName && cleanName.length >= 2 && (pChildName.includes(cleanName) || (nameRoot.length >= 3 && pChildName.includes(nameRoot))));
            const parentMatches = Boolean(
                cleanParent && cleanParent.length >= 2 && (
                    pParentName.includes(cleanParent) || 
                    (pLastName && cleanParent.includes(pLastName)) || 
                    (parentRoot.length >= 3 && (pParentName.includes(parentRoot) || pChildName.includes(parentRoot)))
                )
            );

            if (phoneMatches || nameMatches || parentMatches) {
                const resolved = resolveSpartaCoachAndGroup(p.groupName, p.coachName, p.birthYear, p.childAge || p.age);
                return {
                    found: true,
                    student: {
                        id: d.id,
                        name: rawName,
                        childFirstName: p.childFirstName || '',
                        childLastName: p.childLastName || '',
                        childAge: p.childAge || p.age || 0,
                        groupId: p.groupId || p.targetGroupId,
                        groupName: resolved.groupName,
                        coachName: resolved.coachName,
                        parentPhone: p.parentPhone || p.phone,
                        parentName: p.parentName,
                        source: 'pending'
                    }
                };
            }
        }

        // 2. Search in `users` collection (ONLY children / student profiles)
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const d of usersSnap.docs) {
            const u = d.data();
            const uRole = (u.role || 'user').toLowerCase();
            const excludedRoles = ['admin', 'director', 'developer', 'staff', 'trainer', 'coach', 'parent', 'manager'];
            if (excludedRoles.includes(uRole)) continue;
            if (u.isParent === true || (u.childrenIds && u.childrenIds.length > 0)) continue;

            const rawName = u.childName || u.childFullName || u.displayName || u.name || '';
            if (isInvalidName(rawName)) continue;

            const uParentPhone = normalizePhoneNumber(u.parentPhone || u.phone);
            const uChildPhone = normalizePhoneNumber(u.childPhone);
            const uName = rawName.trim().toLowerCase();
            const uEmail = (u.email || u.parentEmail || u.tempEmail || '').trim().toLowerCase();
            const uParentName = (u.parentName || '').trim().toLowerCase();
            const uLastName = (u.childLastName || '').trim().toLowerCase();

            const phoneMatches = Boolean(cleanPhone && ((uParentPhone && (uParentPhone === cleanPhone || uParentPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uParentPhone))) || (uChildPhone && uChildPhone === cleanPhone)));
            const nameMatches = Boolean(cleanName && cleanName.length >= 3 && (uName.includes(cleanName) || cleanName.includes(uName)));
            const parentMatches = Boolean(cleanParent && cleanParent.length >= 3 && (uParentName.includes(cleanParent) || cleanParent.includes(uParentName) || (uLastName && cleanParent.includes(uLastName))));
            const emailMatches = Boolean(cleanEmail && (uEmail === cleanEmail));

            if (phoneMatches || nameMatches || parentMatches || emailMatches) {
                const resolved = resolveSpartaCoachAndGroup(u.groupName || u.group, u.coachName, u.birthYear, u.childAge || u.age);
                return {
                    found: true,
                    student: {
                        id: d.id,
                        name: rawName,
                        childFirstName: u.childFirstName || '',
                        childLastName: u.childLastName || '',
                        childAge: u.childAge || u.age,
                        groupId: u.groupId || u.group,
                        groupName: resolved.groupName,
                        coachName: resolved.coachName,
                        coachId: u.coachId,
                        parentPhone: u.parentPhone || u.phone,
                        parentName: u.parentName,
                        kidPin: u.kidPin,
                        source: 'users'
                    }
                };
            }
        }

        // 3. Search in `trials` collection (registered trial sessions)
        const trialsSnap = await getDocs(collection(db, 'trials'));
        for (const d of trialsSnap.docs) {
            const t = d.data();
            const rawName = t.childName || t.childFirstName || t.name || '';
            if (isInvalidName(rawName)) continue;

            const tPhone = normalizePhoneNumber(t.parentPhone || t.phone);
            const tName = rawName.trim().toLowerCase();
            const tEmail = (t.email || t.parentEmail || '').trim().toLowerCase();
            const tParentName = (t.parentName || '').trim().toLowerCase();

            const phoneMatches = Boolean(cleanPhone && tPhone && (tPhone === cleanPhone || tPhone.endsWith(cleanPhone)));
            const nameMatches = Boolean(cleanName && cleanName.length >= 3 && (tName.includes(cleanName) || cleanName.includes(tName)));
            const parentMatches = Boolean(cleanParent && cleanParent.length >= 3 && (tParentName.includes(cleanParent) || cleanParent.includes(tParentName)));
            const emailMatches = Boolean(cleanEmail && tEmail === cleanEmail);

            if (phoneMatches || nameMatches || parentMatches || emailMatches) {
                const resolved = resolveSpartaCoachAndGroup(t.groupName || t.streamTitle, t.coachName, t.childBirthYear, t.childAge || t.age);
                return {
                    found: true,
                    student: {
                        id: d.id,
                        name: t.childName || t.childFirstName || t.name || 'Юный Атлет',
                        childFirstName: t.childFirstName || '',
                        childLastName: t.childLastName || '',
                        childAge: t.childAge || t.age,
                        groupId: t.groupId || t.slotId,
                        groupName: resolved.groupName,
                        coachName: resolved.coachName,
                        parentPhone: t.parentPhone || t.phone,
                        parentName: t.parentName,
                        kidPin: t.kidPin,
                        source: 'trials'
                    }
                };
            }
        }

        return { found: false };
    } catch (e) {
        console.error("Error finding existing student:", e);
        return { found: false };
    }
};

export const linkStudentToGroup = async (
    targetUid: string,
    childFullName: string,
    age: number,
    phone: string,
    email: string,
    accountRole: 'user' | 'parent' = 'user',
    sport?: string
) => {
    try {
        const cleanPhone = normalizePhoneNumber(phone);
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const cleanFullName = (childFullName || '').trim();

        console.log(`[studentLinking] Attempting linking: Name="${cleanFullName}", Phone="${phone}" (Normalized="${cleanPhone}"), Email="${cleanEmail}", Role="${accountRole}", UID="${targetUid}"`);

        // 1. Scan for matching existing student records
        const searchResult = await findExistingSpartaStudent(phone, childFullName, email);
        const matched = searchResult.found ? searchResult.student : null;

        // 2. Resolve Group ID, Group Name and Coach Name
        let finalGroupId = matched?.groupId || '';
        let finalGroupName = matched?.groupName || '';
        let finalCoachName = matched?.coachName || '';
        let finalCoachId = matched?.coachId || '';

        // If group is Firestore group ID, fetch actual group details for high precision
        if (finalGroupId) {
            try {
                const grpSnap = await getDoc(doc(db, 'groups', finalGroupId));
                if (grpSnap.exists()) {
                    const gData = grpSnap.data();
                    finalGroupName = gData.name || gData.title || finalGroupName;
                    finalCoachId = gData.coachId || gData.trainerId || finalCoachId;
                    if (!finalCoachName && finalCoachId) {
                        const coachSnap = await getDoc(doc(db, 'users', finalCoachId));
                        if (coachSnap.exists()) {
                            finalCoachName = coachSnap.data().displayName || coachSnap.data().name || 'Тренер Sparta';
                        }
                    }
                }
            } catch (e) {}
        }

        // Auto-assign matching group by age from Sparta Schedule if no group was set
        if (!finalGroupId) {
            const currentYear = new Date().getFullYear();
            const effectiveAge = age && age > 3 && age < 16 ? age : 7;
            const childBirthYear = currentYear - effectiveAge;

            const matchedSlot = SPARTA_SCHEDULE.find(slot => 
                slot.birthYears && slot.birthYears.includes(childBirthYear)
            ) || SPARTA_SCHEDULE[0];

            if (matchedSlot) {
                finalGroupId = matchedSlot.id;
                finalGroupName = `${matchedSlot.streamTitle} (${matchedSlot.ageGroupLabel})`;
                finalCoachName = matchedSlot.coachName;
            }
        }

        const nameParts = cleanFullName.split(/\s+/);
        const childFirstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
        const childLastName = nameParts.length > 1 ? nameParts[0] : '';
        const generatedPin = matched?.kidPin || Math.floor(1000 + Math.random() * 9000).toString();

        if (accountRole === 'user') {
            // ══════════════════════════════════════════════════════════════
            // STUDENT ACCOUNT REGISTRATION
            // ══════════════════════════════════════════════════════════════
            // Check if current targetUid doc already exists
            let targetSnapData: any = null;
            try {
                const targetSnap = await getDoc(doc(db, 'users', targetUid));
                if (targetSnap.exists()) {
                    targetSnapData = targetSnap.data();
                }
            } catch (e) {}

            // Check if there is an existing student document in `users` with different ID
            let existingDocData: any = targetSnapData;
            if (matched && matched.source === 'users' && matched.id !== targetUid) {
                try {
                    const oldSnap = await getDoc(doc(db, 'users', matched.id));
                    if (oldSnap.exists()) {
                        existingDocData = { ...oldSnap.data(), ...targetSnapData };
                    }
                } catch (e) {}
            }

            // Student profile payload with 100% preservation of existing memberships, stats, and achievements
            const studentPayload: any = {
                id: targetUid,
                groupId: finalGroupId || existingDocData?.groupId || '',
                groupName: finalGroupName || existingDocData?.groupName || '',
                coachName: finalCoachName || existingDocData?.coachName || '',
                coachId: finalCoachId || existingDocData?.coachId || null,
                role: existingDocData?.role || 'user',
                status: existingDocData?.status || 'active',
                kidPin: existingDocData?.kidPin || generatedPin,
                displayName: cleanFullName || existingDocData?.displayName || 'Спортсмен Спарта',
                name: cleanFullName || existingDocData?.name || 'Спортсмен Спарта',
                childName: cleanFullName || existingDocData?.childName || 'Спортсмен Спарта',
                childFirstName: childFirstName || existingDocData?.childFirstName || matched?.childFirstName || '',
                childLastName: childLastName || existingDocData?.childLastName || matched?.childLastName || '',
                childAge: age || existingDocData?.childAge || matched?.childAge || 7,
                phone: phone || existingDocData?.phone || matched?.parentPhone || '',
                parentPhone: phone || existingDocData?.parentPhone || matched?.parentPhone || '',
                parentName: matched?.parentName || existingDocData?.parentName || '',
                // CRITICAL NON-DESTRUCTIVE GUARDS:
                hasActiveMembership: existingDocData?.hasActiveMembership ?? false,
                membershipExpires: existingDocData?.membershipExpires ?? null,
                memberships: existingDocData?.memberships || [],
                coins: existingDocData?.coins ?? 0,
                rating: existingDocData?.rating ?? 75,
                skills: existingDocData?.skills || {
                    dribbling: 70,
                    speed: 75,
                    passing: 70,
                    shooting: 65,
                    discipline: 85,
                    teamwork: 80
                },
                badges: existingDocData?.badges || [
                    { id: 'first_step', title: 'Первый шаг в Спарту', icon: '⚽', unlockedAt: new Date().toISOString() }
                ],
                achievements: existingDocData?.achievements || [],
                updatedAt: serverTimestamp()
            };

            // Merge student document safely
            await setDoc(doc(db, 'users', targetUid), studentPayload, { merge: true });

            // If matched was in pending_students, update status to linked
            if (matched && matched.source === 'pending') {
                try {
                    await updateDoc(doc(db, 'pending_students', matched.id), {
                        status: 'linked',
                        assignedUid: targetUid,
                        linkedUserId: targetUid,
                        linkedAt: serverTimestamp()
                    });
                } catch (pErr) {}
            }

            // Auto-join group chat in Firestore `chats`
            if (finalGroupId) {
                try {
                    const qGroupChats = query(collection(db, 'chats'), where('groupId', '==', finalGroupId));
                    const chatSnaps = await getDocs(qGroupChats);
                    for (const cDoc of chatSnaps.docs) {
                        await updateDoc(doc(db, 'chats', cDoc.id), {
                            participants: arrayUnion(targetUid)
                        });
                    }
                } catch (chatErr) {
                    console.log("Could not auto-add to chat:", chatErr);
                }
            }

            return {
                success: true,
                childId: targetUid,
                childName: cleanFullName,
                groupId: finalGroupId,
                groupName: finalGroupName,
                coachName: finalCoachName,
                kidPin: generatedPin,
                isExisting: !!matched
            };
        } else {
            // ══════════════════════════════════════════════════════════════
            // PARENT ACCOUNT REGISTRATION
            // ══════════════════════════════════════════════════════════════
            let childId: string;

            if (matched && matched.source === 'users') {
                childId = matched.id;
                await updateDoc(doc(db, 'users', childId), {
                    parentId: targetUid,
                    status: 'active',
                    groupId: finalGroupId,
                    groupName: finalGroupName,
                    coachName: finalCoachName,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create a new child doc if none existed
                const newChildRef = doc(collection(db, 'users'));
                childId = newChildRef.id;
                await setDoc(newChildRef, {
                    id: childId,
                    groupId: finalGroupId,
                    groupName: finalGroupName,
                    coachName: finalCoachName,
                    coachId: finalCoachId || null,
                    parentId: targetUid,
                    role: 'user',
                    status: 'active',
                    kidPin: generatedPin,
                    displayName: cleanFullName || 'Спортсмен Спарта',
                    name: cleanFullName || 'Спортсмен Спарта',
                    childName: cleanFullName || 'Спортсмен Спарта',
                    childFirstName,
                    childLastName,
                    childAge: age || 7,
                    parentPhone: phone,
                    parentEmail: email,
                    parentName: '',
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
                    createdAt: serverTimestamp()
                });
            }

            // Link child to parent doc
            const parentRef = doc(db, 'users', targetUid);
            await updateDoc(parentRef, {
                childrenIds: arrayUnion(childId),
                isLinked: true,
                updatedAt: serverTimestamp()
            });

            // If matched was in pending_students, update status to linked
            if (matched && matched.source === 'pending') {
                try {
                    await updateDoc(doc(db, 'pending_students', matched.id), {
                        status: 'linked',
                        assignedUid: childId,
                        linkedUserId: childId,
                        linkedAt: serverTimestamp()
                    });
                } catch (pErr) {}
            }

            return {
                success: true,
                childId,
                childName: cleanFullName,
                groupId: finalGroupId,
                groupName: finalGroupName,
                coachName: finalCoachName,
                kidPin: generatedPin,
                isExisting: !!matched
            };
        }
    } catch (error) {
        console.error("Error linking student to group:", error);
        return { success: false, error };
    }
};

export const unlinkChildFromParent = async (parentUid: string, childUid: string) => {
    try {
        if (!parentUid || !childUid) return { success: false, message: 'Неверные параметры при отвязке.' };

        const parentRef = doc(db, 'users', parentUid);
        await updateDoc(parentRef, {
            childrenIds: arrayRemove(childUid),
            updatedAt: serverTimestamp()
        });

        const childRef = doc(db, 'users', childUid);
        await updateDoc(childRef, {
            parentId: deleteField(),
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error unlinking child from parent:', error);
        return { success: false, error, message: 'Не удалось отвязать профиль.' };
    }
};