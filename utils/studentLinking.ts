import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { SPARTA_SCHEDULE } from '../constants/spartaSchedule';

export const linkStudentToGroup = async (
    parentUid: string,
    childFullName: string,
    age: number,
    phone: string,
    email: string,
    roleOrDob?: string,
    sport?: string
) => {
    try {
        const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
        const cleanPhone = normalizePhone(phone);
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const cleanFullName = childFullName ? childFullName.trim() : '';

        console.log(`Attempting to link student: ${cleanFullName}, Phone: ${phone} (Clean: ${cleanPhone}), Email: ${cleanEmail}`);

        const pendingRef = collection(db, 'pending_students');
        let matchedDoc: { id: string; data: any; isLegacyRegistry?: boolean } | null = null;

        // Query pending_students with status 'pending'
        const pendingSnap = await getDocs(query(pendingRef, where('status', '==', 'pending')));

        for (const docSnap of pendingSnap.docs) {
            const data = docSnap.data();
            const pPhone = data.parentPhone ? data.parentPhone.replace(/\D/g, '') : '';
            const pEmail = data.parentEmail ? data.parentEmail.trim().toLowerCase() : '';
            const cName = data.childFullName ? data.childFullName.trim() : '';

            const phoneMatch = cleanPhone && pPhone && cleanPhone === pPhone;
            const emailMatch = cleanEmail && pEmail && cleanEmail === pEmail;
            const nameMatch = cleanFullName && cName && cleanFullName.toLowerCase() === cName.toLowerCase();

            if (phoneMatch || emailMatch || nameMatch) {
                matchedDoc = { id: docSnap.id, data };
                break;
            }
        }

        // Fallback check on student_registry for legacy records
        if (!matchedDoc) {
            const regRef = collection(db, 'student_registry');
            const regSnap = await getDocs(query(regRef, where('assignedUid', '==', null)));
            for (const docSnap of regSnap.docs) {
                const data = docSnap.data();
                const pPhone = data.parentPhone || data.normalizedPhone || '';
                const cName = data.originalName || data.normalizedName || '';

                if ((cleanPhone && pPhone.replace(/\D/g, '') === cleanPhone) || (cleanFullName && cName.toLowerCase() === cleanFullName.toLowerCase())) {
                    matchedDoc = {
                        id: docSnap.id,
                        data: {
                            groupId: data.targetGroupId,
                            groupName: data.groupName || 'Группа',
                            childFullName: cleanFullName,
                            childAge: age
                        },
                        isLegacyRegistry: true
                    };
                    break;
                }
            }
        }

        // Auto-assign matching group by age if not present in registry
        let finalGroupId = matchedDoc?.data?.groupId || '';
        let finalGroupName = matchedDoc?.data?.groupName || '';
        let finalCoachName = matchedDoc?.data?.coachName || '';

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

        // 1. Create/Update child profile in users with groupId, parentId, role: 'user', status: 'active'
        const nameParts = cleanFullName.split(/\s+/);
        const childFirstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
        const childLastName = nameParts.length > 1 ? nameParts[0] : '';

        // Search for existing child profile by parentId OR child name OR phone
        let existingChildDoc: { id: string; data: any } | null = null;
        
        const childQuery = query(collection(db, 'users'), where('parentId', '==', parentUid));
        const childSnap = await getDocs(childQuery);
        if (!childSnap.empty) {
            existingChildDoc = { id: childSnap.docs[0].id, data: childSnap.docs[0].data() };
        } else {
            const allUsersSnap = await getDocs(collection(db, 'users'));
            for (const uDoc of allUsersSnap.docs) {
                if (uDoc.id === parentUid) continue;
                
                const uData = uDoc.data();
                if (uData.role === 'parent') continue;
                
                const uName = (uData.childName || uData.childFullName || uData.name || '').trim().toLowerCase();
                const uPhone = (uData.parentPhone || uData.phone || '').replace(/\D/g, '');
                
                const nameMatches = cleanFullName && uName && uName === cleanFullName.toLowerCase();
                const phoneMatches = cleanPhone && uPhone && uPhone === cleanPhone && uData.role === 'user';
                
                if (nameMatches || phoneMatches) {
                    existingChildDoc = { id: uDoc.id, data: uData };
                    break;
                }
            }
        }

        let childId: string;
        const parentName = matchedDoc?.data?.parentName || '';
        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        if (existingChildDoc) {
            childId = existingChildDoc.id;
            const updateFields: any = {
                parentId: parentUid,
                status: 'active',
                updatedAt: serverTimestamp()
            };
            if (!existingChildDoc.data.kidPin) {
                updateFields.kidPin = generatedPin;
            }
            if (finalGroupId && !existingChildDoc.data.groupId) {
                updateFields.groupId = finalGroupId;
                updateFields.groupName = finalGroupName;
                updateFields.coachName = finalCoachName;
            }
            await updateDoc(doc(db, 'users', childId), updateFields);
        } else {
            const newChildRef = doc(collection(db, 'users'));
            childId = newChildRef.id;
            await setDoc(newChildRef, {
                id: childId,
                groupId: finalGroupId,
                groupName: finalGroupName,
                coachName: finalCoachName,
                parentId: parentUid,
                role: 'user',
                status: 'active',
                kidPin: generatedPin,
                displayName: cleanFullName || 'Спортсмен',
                name: cleanFullName || 'Спортсмен',
                childName: cleanFullName,
                childFirstName,
                childLastName,
                childAge: age || matchedDoc?.data?.childAge || 7,
                parentPhone: phone,
                parentEmail: email,
                parentName: parentName || '',
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


        // 2. Update parent document in users to append child's ID into childrenIds array (WITHOUT assigning groupId to parent)
        const parentRef = doc(db, 'users', parentUid);
        await updateDoc(parentRef, {
            childrenIds: arrayUnion(childId),
            isLinked: true,
            updatedAt: serverTimestamp()
        });

        // 3. Update pending_students/{docId} record status to 'linked'
        if (matchedDoc) {
            if (matchedDoc.isLegacyRegistry) {
                await updateDoc(doc(db, 'student_registry', matchedDoc.id), {
                    assignedUid: parentUid,
                    linkedAt: serverTimestamp(),
                    linkedEmail: email
                });
            } else {
                await updateDoc(doc(db, 'pending_students', matchedDoc.id), {
                    status: 'linked',
                    linkedParentId: parentUid,
                    linkedChildId: childId,
                    linkedAt: serverTimestamp()
                });
            }
            return { success: true, childId, groupId: matchedDoc.data.groupId || finalGroupId, groupName: matchedDoc.data.groupName || finalGroupName };
        }

        return { success: true, childId, groupId: finalGroupId, groupName: finalGroupName };
    } catch (error) {
        console.error("Error linking student:", error);
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