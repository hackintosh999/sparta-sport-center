import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

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

export const findChildToLink = async (childName: string, phone?: string) => {
    try {
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        const cleanName = childName ? childName.trim().toLowerCase() : '';

        const pendingRef = collection(db, 'pending_students');
        let pendingDocs: any[] = [];

        if (cleanPhone) {
            const qPhone = query(pendingRef, where('status', '==', 'pending'), where('parentPhone', '==', cleanPhone));
            const snapPhone = await getDocs(qPhone);
            pendingDocs.push(...snapPhone.docs.map(d => ({ id: d.id, ...d.data(), type: 'pending' })));
        }

        if (cleanName && pendingDocs.length === 0) {
            const snapName = await getDocs(query(pendingRef, where('status', '==', 'pending')));
            snapName.docs.forEach(d => {
                const data = d.data();
                const fullName = (data.childFullName || `${data.childFirstName || ''} ${data.childLastName || ''}`).toLowerCase();
                if (fullName.includes(cleanName)) {
                    pendingDocs.push({ id: d.id, ...data, type: 'pending' });
                }
            });
        }

        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('role', '==', 'user'));
        const snapUsers = await getDocs(qUsers);
        const userDocs = snapUsers.docs
            .map(d => ({ id: d.id, ...d.data(), type: 'user' }))
            .filter((u: any) => {
                const uName = (u.childName || u.childFirstName || u.displayName || '').toLowerCase();
                const uPhone = (u.parentPhone || '').replace(/\D/g, '');
                return (cleanName && uName.includes(cleanName)) || (cleanPhone && uPhone.length >= 4 && uPhone === cleanPhone);
            });

        // Deduplicate: Exclude pending records if active user profile already exists
        const activeUserNames = new Set(userDocs.map((u: any) => (u.childName || u.displayName || u.childFirstName || '').trim().toLowerCase()));
        const uniquePendingDocs = pendingDocs.filter((p: any) => {
            const pName = (p.childFullName || `${p.childFirstName || ''} ${p.childLastName || ''}`).trim().toLowerCase();
            return !activeUserNames.has(pName);
        });

        return [
            ...uniquePendingDocs.map((p: any) => ({
                id: p.id,
                name: p.childFullName || `${p.childFirstName} ${p.childLastName}`,
                age: p.childAge,
                type: 'pending',
                groupId: p.groupId,
                groupName: p.groupName
            })),
            ...userDocs.map((u: any) => ({
                id: u.id,
                name: u.childName || u.displayName || u.childFirstName,
                age: u.childAge,
                type: 'user'
            }))
        ];
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

export const linkParentToRegistryChild = async (parentId: string, registryId: string, candidateName?: string) => {
    try {
        const regRef = doc(db, 'student_registry', registryId);
        await updateDoc(regRef, { assignedUid: parentId, linkedAt: serverTimestamp() });
        return { success: true };
    } catch (e) {
        console.error('Error linking parent to registry child:', e);
        return { success: false, error: e, message: 'Не удалось привязать из реестра.' };
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
