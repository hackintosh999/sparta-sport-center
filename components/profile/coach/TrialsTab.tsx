import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    Phone,
    MessageSquare,
    Trophy,
    CheckCircle2,
    X,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Calendar,
    AlertCircle,
    Info,
    Archive,
    Trash2,
    Check,
    Loader2,
    Layers,
    Clock,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    addDoc,
    serverTimestamp,
    limit,
    writeBatch,
    updateDoc
} from 'firebase/firestore';
import confetti from 'canvas-confetti';

export interface TrialRequest {
    id: string;
    name?: string;
    childSurname?: string;
    childName?: string;
    childAge?: number;
    age?: number;
    birthYear?: number;
    childBirthYear?: number;
    parentName?: string;
    parentDisplayName?: string;
    parentPhone?: string;
    phone?: string;
    parentId?: string;
    userId?: string;
    assignedUid?: string;
    level?: string;
    experienceLevel?: string;
    otherSports?: string;
    footballExp?: string;
    motivation?: string;
    comment?: string;
    notes?: string;
    status?: string;
    isMembership?: boolean;
    paymentMethod?: string;
    createdAt?: any;
    assignedGroupId?: string;
    chatId?: string;
    coachId?: string;
    assignedCoachId?: string;
    transferredFrom?: string;
    transferredFromId?: string;
    transferNote?: string;
    transferredAt?: any;
}

export interface TrialsTabProps {
    trialRequests: TrialRequest[];
    myTrialRequests?: TrialRequest[];
    myGroups: any[];
    allGroups?: any[];
    user?: any;
    userProfile?: any;
    onEnrollStudent?: (trial: TrialRequest, groupId: string) => Promise<void>;
    onArchiveRequest?: (trialId: string) => Promise<void>;
    onDeleteRequest?: (id: string) => void;
    onContactParent?: (person: TrialRequest) => void;
    // Legacy props for compatibility
    trialEvaluations?: Record<string, any>;
    calculateGroupFit?: (trial: any, group: any) => number;
    handleStartComparison?: (trial: any) => void;
    handleContactParent?: (person: any) => void;
    setSelectedTrialForEval?: (trial: any) => void;
    setIsEvaluationModalOpen?: (open: boolean) => void;
    setCurrentEvalSkills?: (skills: any) => void;
    onViewDetails?: (trial: any) => void;
    setSelectedEvalTags?: (tags: string[]) => void;
    setCoachEvalComment?: (comment: string) => void;
}

// Age & Birth Year matcher for smart group suggestions
export const calculateAgeMatch = (
    childAge?: number,
    birthYear?: number,
    group?: any
): { isMatch: boolean; reason: string } => {
    if (!group) return { isMatch: false, reason: '' };

    const currentYear = new Date().getFullYear();
    const derivedBirthYear = birthYear || (childAge ? currentYear - childAge : null);
    const derivedAge = childAge || (birthYear ? currentYear - birthYear : null);

    const groupName = (group.name || '').toLowerCase();
    const groupCategory = (group.ageCategory || group.category || '').toLowerCase();

    // 1. Match full or short birth year (e.g., 2014, 2015, '14, '15)
    if (derivedBirthYear) {
        const yearStr = String(derivedBirthYear);
        const shortYear = yearStr.slice(-2);
        if (groupName.includes(yearStr) || groupCategory.includes(yearStr)) {
            return { isMatch: true, reason: `Год рождения: ${derivedBirthYear}` };
        }
        if (groupName.includes(shortYear) && (groupName.includes('20') || groupName.includes('-') || groupName.includes('/'))) {
            return { isMatch: true, reason: `Год: ${derivedBirthYear}` };
        }
    }

    // 2. Match age / U-category (e.g., U11, 11 лет)
    if (derivedAge) {
        const uTag = `u${derivedAge}`;
        const uTagUpper = `u-${derivedAge}`;
        if (groupName.includes(uTag) || groupName.includes(uTagUpper) || groupCategory.includes(uTag)) {
            return { isMatch: true, reason: `Категория U${derivedAge}` };
        }

        // 3. Match age ranges like "10-12" or "6-8"
        const combinedText = `${group.name || ''} ${group.ageRange || ''} ${group.ageCategory || ''}`;
        const rangeMatch = combinedText.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10);
            const max = parseInt(rangeMatch[2], 10);
            if (min <= derivedAge && derivedAge <= max && max <= 25) {
                return { isMatch: true, reason: `Возраст ${min}–${max} лет` };
            }
        }
    }

    return { isMatch: false, reason: '' };
};

const TrialsTab: React.FC<TrialsTabProps> = ({
    trialRequests = [],
    myTrialRequests = [],
    myGroups = [],
    allGroups = [],
    user,
    userProfile,
    onEnrollStudent,
    onArchiveRequest,
    onDeleteRequest,
    onContactParent
}) => {
    const navigate = useNavigate();
    const [selectedGroupMap, setSelectedGroupMap] = useState<Record<string, string>>({});
    const [transferNoteMap, setTransferNoteMap] = useState<Record<string, string>>({});
    const [isCheckingUserForId, setIsCheckingUserForId] = useState<string | null>(null);
    const [isEnrollingId, setIsEnrollingId] = useState<string | null>(null);
    const [isArchivingId, setIsArchivingId] = useState<string | null>(null);
    const [fetchedGroups, setFetchedGroups] = useState<any[]>([]);
    const [unregisteredModal, setUnregisteredModal] = useState<{
        isOpen: boolean;
        applicantName: string;
        phone: string;
    }>({ isOpen: false, applicantName: '', phone: '' });

    // Fetch all groups if not provided via props
    React.useEffect(() => {
        if (!allGroups || allGroups.length === 0) {
            getDocs(collection(db, 'groups'))
                .then((snap) => {
                    const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setFetchedGroups(loaded);
                })
                .catch(err => console.warn('Error fetching groups in TrialsTab:', err));
        }
    }, [allGroups]);

    const combinedAllGroups = useMemo(() => {
        return (allGroups && allGroups.length > 0) ? allGroups : fetchedGroups;
    }, [allGroups, fetchedGroups]);

    const currentCoachId = user?.uid || userProfile?.coachId || userProfile?.id || '';
    const currentCoachName = userProfile?.name || userProfile?.full_name || 'Тренер';

    // Split groups into "My Groups" and "Colleague Groups"
    const { myGroupList, colleagueGroupList } = useMemo(() => {
        const pool = combinedAllGroups.length > 0 ? combinedAllGroups : myGroups;
        const myIds = new Set((myGroups || []).map(g => g.id));
        const my: any[] = [];
        const colleague: any[] = [];

        pool.forEach(g => {
            const isMine =
                myIds.has(g.id) ||
                g.coachId === currentCoachId ||
                (g.coachName && g.coachName === currentCoachName);
            if (isMine) {
                my.push(g);
            } else {
                colleague.push(g);
            }
        });

        if (my.length === 0 && myGroups && myGroups.length > 0) {
            my.push(...myGroups);
        }

        return { myGroupList: my, colleagueGroupList: colleague };
    }, [combinedAllGroups, myGroups, currentCoachId, currentCoachName]);

    // Active pending trial requests
    const activeRequests = useMemo(() => {
        const source = trialRequests.length > 0 ? trialRequests : myTrialRequests;
        return source.filter(r => {
            if (r.status === 'enrolled' || r.status === 'accepted' || r.status === 'archived' || r.status === 'rejected') {
                return false;
            }
            // If request was transferred away to another coach, don't show to current coach
            if (r.status === 'transferred' && r.transferredFromId === currentCoachId && r.coachId !== currentCoachId) {
                return false;
            }
            return true;
        });
    }, [trialRequests, myTrialRequests, currentCoachId]);

    // Get or auto-calculate the default selected group for an applicant
    const getSelectedGroupId = (applicant: TrialRequest) => {
        if (selectedGroupMap[applicant.id]) {
            return selectedGroupMap[applicant.id];
        }

        const childAge = applicant.childAge || applicant.age;
        const birthYear = applicant.birthYear || applicant.childBirthYear;

        // Try to find a matching group in my groups first
        const myMatch = myGroupList.find(g => calculateAgeMatch(childAge, birthYear, g).isMatch);
        if (myMatch) {
            return myMatch.id;
        }

        if (myGroupList.length > 0) {
            return myGroupList[0].id;
        }

        // Fallback to colleague match
        const colleagueMatch = colleagueGroupList.find(g => calculateAgeMatch(childAge, birthYear, g).isMatch);
        if (colleagueMatch) {
            return colleagueMatch.id;
        }

        return colleagueGroupList[0]?.id || '';
    };

    // 1. Sparta Internal Messenger Logic with Firestore User Validation
    const handleChatWithParent = async (applicant: TrialRequest) => {
        setIsCheckingUserForId(applicant.id);

        try {
            const rawPhone = applicant.parentPhone || applicant.phone || '';
            const cleanPhone = String(rawPhone).replace(/\D/g, '');
            let parentUid = applicant.parentId || applicant.userId || applicant.assignedUid || null;
            let parentUser: any = null;

            // Step 1: Check by direct parentId if available
            if (parentUid) {
                try {
                    const userSnap = await getDoc(doc(db, 'users', parentUid));
                    if (userSnap.exists()) {
                        parentUser = { id: userSnap.id, ...userSnap.data() };
                    } else {
                        parentUid = null;
                    }
                } catch {
                    parentUid = null;
                }
            }

            // Step 2: Search in 'users' collection by phone variants
            if (!parentUid && cleanPhone.length >= 10) {
                const phoneVariants = [
                    cleanPhone,
                    `+7${cleanPhone.slice(-10)}`,
                    `8${cleanPhone.slice(-10)}`,
                    `7${cleanPhone.slice(-10)}`
                ];

                const q1 = query(
                    collection(db, 'users'),
                    where('phone', 'in', phoneVariants),
                    limit(1)
                );
                const snap1 = await getDocs(q1);

                if (!snap1.empty) {
                    parentUser = { id: snap1.docs[0].id, ...snap1.docs[0].data() };
                    parentUid = parentUser.id;
                } else {
                    const q2 = query(
                        collection(db, 'users'),
                        where('parentPhone', 'in', phoneVariants),
                        limit(1)
                    );
                    const snap2 = await getDocs(q2);
                    if (!snap2.empty) {
                        parentUser = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
                        parentUid = parentUser.id;
                    }
                }
            }

            // Scenario A: Parent IS REGISTERED in Sparta
            if (parentUid && parentUser) {
                const currentCoachId = user?.uid || userProfile?.coachId || 'coach';
                const coachName = userProfile?.name || userProfile?.full_name || 'Тренер';
                const parentName =
                    parentUser.full_name ||
                    parentUser.name ||
                    parentUser.displayName ||
                    applicant.parentName ||
                    applicant.parentDisplayName ||
                    'Родитель';
                const childName = applicant.childName || applicant.name || 'Спортсмен';

                // 1. Idempotent check: query existing chat where coach and parent are both participants
                let targetChatId: string | null = null;
                try {
                    const qChats = query(
                        collection(db, 'chats'),
                        where('participants', 'array-contains', currentCoachId)
                    );
                    const snapChats = await getDocs(qChats);
                    const existingDoc = snapChats.docs.find(d => {
                        const data = d.data();
                        return data.participants?.includes(parentUid) || data.parentId === parentUid;
                    });
                    if (existingDoc) {
                        targetChatId = existingDoc.id;
                    }
                } catch (e) {
                    console.warn("Could not query existing chat:", e);
                }

                // 2. Check deterministic ID as fallback
                if (!targetChatId) {
                    const deterministicId = [currentCoachId, parentUid].sort().join('_');
                    try {
                        const directSnap = await getDoc(doc(db, 'chats', deterministicId));
                        if (directSnap.exists()) {
                            targetChatId = deterministicId;
                        }
                    } catch (e) {}
                }

                // 3. If chat exists, reuse it and update metadata; otherwise, create a single new document
                if (targetChatId) {
                    const chatRef = doc(db, 'chats', targetChatId);
                    await setDoc(chatRef, {
                        childName: childName,
                        studentName: childName,
                        parentName: parentName,
                        parentId: parentUid,
                        coachId: currentCoachId,
                        participantDetails: {
                            [currentCoachId]: { name: coachName, role: 'coach' },
                            [parentUid]: { name: parentName, role: 'parent' }
                        },
                        participantNames: {
                            [currentCoachId]: coachName,
                            [parentUid]: parentName
                        },
                        participantRoles: {
                            [currentCoachId]: 'coach',
                            [parentUid]: 'parent'
                        },
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                } else {
                    const newChatRef = await addDoc(collection(db, 'chats'), {
                        name: `Чат с родителем (${childName})`,
                        type: 'parent',
                        childName: childName,
                        studentName: childName,
                        parentName: parentName,
                        parentId: parentUid,
                        coachId: currentCoachId,
                        participants: [currentCoachId, parentUid],
                        participantDetails: {
                            [currentCoachId]: { name: coachName, role: 'coach' },
                            [parentUid]: { name: parentName, role: 'parent' }
                        },
                        participantNames: {
                            [currentCoachId]: coachName,
                            [parentUid]: parentName
                        },
                        participantRoles: {
                            [currentCoachId]: 'coach',
                            [parentUid]: 'parent'
                        },
                        lastMessage: 'Заявка на пробное занятие принята',
                        lastMessageAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        createdBy: currentCoachId,
                        isPrivate: true
                    });
                    targetChatId = newChatRef.id;
                }

                // Seamless routing to Sparta messenger tab
                window.dispatchEvent(
                    new CustomEvent('sparta_navigate_tab', {
                        detail: {
                            tab: 'messages_unified',
                            chatId: targetChatId,
                            targetUid: parentUid,
                            targetName: parentName,
                            studentName: childName
                        }
                    })
                );

                navigate(`/dashboard?tab=messages_unified&chatId=${targetChatId}&targetUid=${parentUid}&targetName=${encodeURIComponent(parentName)}&studentName=${encodeURIComponent(childName)}`);

                if (onContactParent) {
                    onContactParent({
                        ...applicant,
                        parentId: parentUid,
                        parentName: parentName,
                        chatId: targetChatId
                    });
                }
            } else {
                // Scenario B: Parent is NOT registered yet -> show notice modal with phone call action
                setUnregisteredModal({
                    isOpen: true,
                    applicantName: applicant.childName || applicant.name || 'Спортсмен',
                    phone: rawPhone || 'Телефон не указан'
                });
            }
        } catch (err) {
            console.error('Error validating parent user:', err);
            // Fallback modal
            const rawPhone = applicant.parentPhone || applicant.phone || '';
            setUnregisteredModal({
                isOpen: true,
                applicantName: applicant.childName || applicant.name || 'Спортсмен',
                phone: rawPhone || 'Телефон не указан'
            });
        } finally {
            setIsCheckingUserForId(null);
        }
    };

    // 2. Direct Enrollment Handler
    const handleEnroll = async (applicant: TrialRequest) => {
        const targetGroupId = getSelectedGroupId(applicant);
        if (!targetGroupId) {
            alert('Пожалуйста, выберите группу для зачисления');
            return;
        }

        setIsEnrollingId(applicant.id);

        try {
            if (onEnrollStudent) {
                await onEnrollStudent(applicant, targetGroupId);
            } else {
                // Fallback direct Firestore enrollment
                const batch = writeBatch(db);
                const targetGroup = [...myGroupList, ...colleagueGroupList].find(g => g.id === targetGroupId);
                const targetCoachId = targetGroup?.coachId || userProfile?.coachId || user?.uid || '';
                const studentId = `student_${applicant.id}_${Date.now()}`;

                // 1. Create Student Doc
                const studentRef = doc(db, 'students', studentId);
                batch.set(studentRef, {
                    name: applicant.childName || applicant.name || 'Новый ученик',
                    surname: applicant.childSurname || '',
                    phone: applicant.phone || applicant.parentPhone || '',
                    parentName: applicant.parentName || applicant.parentDisplayName || '',
                    email: (applicant as any).email || '',
                    groupId: targetGroupId,
                    coachId: targetCoachId,
                    type: applicant.isMembership ? 'regular' : 'trial',
                    status: 'active',
                    createdAt: serverTimestamp(),
                    trialRequestId: applicant.id,
                    experienceLevel: applicant.experienceLevel || applicant.level || 'beginner',
                    birthYear: applicant.birthYear || applicant.childBirthYear || null,
                    age: applicant.childAge || applicant.age || null
                });

                // 2. Update Request Status to Accepted
                const requestRef = doc(db, 'requests', applicant.id);
                batch.update(requestRef, {
                    status: 'accepted',
                    enrolledAt: serverTimestamp(),
                    assignedGroupId: targetGroupId,
                    assignedCoachId: targetCoachId
                });

                await batch.commit();
            }

            // Confetti celebration
            try {
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } catch {
                // ignore
            }
        } catch (err) {
            console.error('Error enrolling student:', err);
            alert('Ошибка при зачислении спортсмена');
        } finally {
            setIsEnrollingId(null);
        }
    };

    // 3. Transfer to Colleague Handler
    const handleTransferToColleague = async (applicant: TrialRequest) => {
        const targetGroupId = getSelectedGroupId(applicant);
        if (!targetGroupId) {
            alert('Пожалуйста, выберите группу коллеги');
            return;
        }

        const targetGroup = colleagueGroupList.find(g => g.id === targetGroupId) || combinedAllGroups.find(g => g.id === targetGroupId);
        const reason = transferNoteMap[applicant.id]?.trim() || 'Перевод в подходящую группу коллеги';

        setIsEnrollingId(applicant.id);
        try {
            const targetCoachId = targetGroup?.coachId || targetGroup?.coach || '';

            const batch = writeBatch(db);
            const requestRef = doc(db, 'requests', applicant.id);

            batch.update(requestRef, {
                coachId: targetCoachId,
                assignedCoachId: targetCoachId,
                groupId: targetGroupId,
                assignedGroupId: targetGroupId,
                status: 'transferred',
                transferredFrom: currentCoachName,
                transferredFromId: currentCoachId,
                transferNote: reason,
                transferredAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // If there's an active chat, post system message
            if (applicant.chatId) {
                const msgRef = doc(collection(db, 'chats', applicant.chatId, 'messages'));
                batch.set(msgRef, {
                    text: `Заявка перенаправлена тренеру группы "${targetGroup?.name || 'Sparta'}". Причина: ${reason}`,
                    senderId: currentCoachId,
                    createdAt: serverTimestamp(),
                    type: 'system'
                });
            }

            await batch.commit();

            alert(`Заявка успешно передана в состав коллеги (${targetGroup?.name || 'Группа'})`);
        } catch (err) {
            console.error('Error transferring applicant to colleague:', err);
            alert('Ошибка при переводе заявки коллеге');
        } finally {
            setIsEnrollingId(null);
        }
    };

    // 4. Direct Archive Handler
    const handleArchive = async (applicantId: string) => {
        if (!window.confirm('Отправить заявку в архив?')) return;

        setIsArchivingId(applicantId);
        try {
            if (onArchiveRequest) {
                await onArchiveRequest(applicantId);
            } else {
                await updateDoc(doc(db, 'requests', applicantId), {
                    status: 'archived',
                    archivedAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error('Error archiving request:', err);
            alert('Ошибка при архивации заявки');
        } finally {
            setIsArchivingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-[#141416]/95 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sparta-gold/15 border border-sparta-gold/30 text-sparta-gold flex items-center justify-center text-xl shadow-inner">
                                📥
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                Новички и заявки
                            </h3>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm font-medium pl-1">
                            Быстрая связь с родителями и прямое зачисление в группы
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-2xl bg-black/40 border border-white/10">
                        <div className="w-2.5 h-2.5 rounded-full bg-sparta-gold animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                        <span className="text-xs font-russo text-white tracking-wider">
                            {activeRequests.length} {activeRequests.length === 1 ? 'заявка' : activeRequests.length < 5 ? 'заявки' : 'заявок'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Applicant Cards Grid */}
            {activeRequests.length === 0 ? (
                <div className="py-20 rounded-[2.5rem] bg-[#141416]/50 border border-white/5 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center text-3xl text-sparta-gold">
                        ✨
                    </div>
                    <div>
                        <h4 className="text-lg font-russo text-white uppercase mb-1">
                            Все заявки обработаны
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-md">
                            Новые входящие заявки на пробные тренировки и абонементы автоматически появятся здесь
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeRequests.map((applicant) => {
                        const childFullName = [
                            applicant.childSurname,
                            applicant.childName || applicant.name
                        ].filter(Boolean).join(' ') || 'Новый спортсмен';

                        const childAge = applicant.childAge || applicant.age;
                        const birthYear = applicant.birthYear || applicant.childBirthYear;
                        const parentFullName = applicant.parentName || applicant.parentDisplayName;
                        const rawPhone = applicant.parentPhone || applicant.phone || '';
                        const cleanPhone = String(rawPhone).replace(/\D/g, '');
                        const telHref = cleanPhone ? `tel:+${cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone}` : null;

                        const selectedGroupId = getSelectedGroupId(applicant);
                        const isEnrolling = isEnrollingId === applicant.id;
                        const isArchiving = isArchivingId === applicant.id;
                        const isChecking = isCheckingUserForId === applicant.id;

                        return (
                            <motion.div
                                key={applicant.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-6 bg-[#141416] border border-white/10 hover:border-sparta-gold/40 rounded-[2.5rem] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] flex flex-col justify-between space-y-5 relative group"
                            >
                                {/* 1. Card Header: Child Name & Status Badge */}
                                <div className="space-y-3">
                                    {/* Transferred from colleague badge */}
                                    {applicant.transferredFrom && (
                                        <div className="p-2.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-start gap-2">
                                            <span className="text-base shrink-0">🔄</span>
                                            <div className="min-w-0">
                                                <p className="font-bold uppercase tracking-wider text-[10px]">
                                                    Перевод от коллеги: {applicant.transferredFrom}
                                                </p>
                                                {applicant.transferNote && (
                                                    <p className="text-[11px] text-white/80 mt-0.5 italic line-clamp-2">
                                                        «{applicant.transferNote}»
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-lg sm:text-xl font-russo text-white uppercase tracking-tight truncate group-hover:text-sparta-gold transition-colors">
                                                {childFullName}
                                                {childAge ? `, ${childAge} лет` : birthYear ? `, ${birthYear} г.р.` : ''}
                                            </h4>
                                            {birthYear && childAge && (
                                                <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">
                                                    Год рождения: {birthYear}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            {applicant.isMembership ? (
                                                applicant.paymentMethod === 'cash' ? (
                                                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                                                        💵 Абонемент (на поле)
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                                        💳 Абонемент (оплачен)
                                                    </span>
                                                )
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                                    🟡 Ожидает звонка
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Parent Information Row */}
                                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                                                👤 {parentFullName ? `Родитель: ${parentFullName}` : 'Родитель не указан'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Phone size={13} className="text-sparta-gold" />
                                                {telHref ? (
                                                    <a
                                                        href={telHref}
                                                        className="text-xs font-bold text-white hover:text-sparta-gold transition-colors underline-offset-4 hover:underline"
                                                    >
                                                        {rawPhone}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-zinc-500 italic">Телефон не указан</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional comments / notes if left by parent */}
                                        {(applicant.comment || applicant.notes || applicant.footballExp) && (
                                            <p className="text-[11px] text-zinc-400 italic bg-white/[0.02] p-2 rounded-xl border border-white/5 line-clamp-2">
                                                💬 {applicant.comment || applicant.notes || applicant.footballExp}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Communication Actions */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleChatWithParent(applicant)}
                                        disabled={isChecking}
                                        className="py-2.5 px-3 rounded-xl bg-sparta-gold/15 hover:bg-sparta-gold/25 border border-sparta-gold/30 text-sparta-gold text-xs font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                        title="Написать во внутренний чат Спарты"
                                    >
                                        {isChecking ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <MessageSquare size={13} />
                                        )}
                                        <span>Чат Спарты</span>
                                    </button>

                                    {telHref ? (
                                        <a
                                            href={telHref}
                                            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 text-center"
                                        >
                                            <Phone size={13} className="text-emerald-400" />
                                            <span>Позвонить</span>
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/5 text-zinc-600 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed"
                                        >
                                            <Phone size={13} />
                                            <span>Нет тел.</span>
                                        </button>
                                    )}
                                </div>

                                {/* 3. Instant Enrollment / Transfer Block */}
                                {(() => {
                                    const isColleagueGroup = colleagueGroupList.some(g => g.id === selectedGroupId);
                                    const currentG = [...myGroupList, ...colleagueGroupList].find(g => g.id === selectedGroupId);
                                    const matchInfo = calculateAgeMatch(childAge, birthYear, currentG);

                                    return (
                                        <div className="pt-4 border-t border-white/10 space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                                                    <span className="flex items-center gap-1">
                                                        <Layers size={11} className="text-sparta-gold" /> Группа для зачисления:
                                                    </span>
                                                    {matchInfo.isMatch && (
                                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                                            🌟 {matchInfo.reason}
                                                        </span>
                                                    )}
                                                </label>

                                                {/* Smart Grouped Selector */}
                                                <select
                                                    value={selectedGroupId}
                                                    onChange={(e) => {
                                                        setSelectedGroupMap(prev => ({
                                                            ...prev,
                                                            [applicant.id]: e.target.value
                                                        }));
                                                    }}
                                                    className="w-full bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl px-3 py-2.5 text-xs text-white outline-none font-bold transition-all cursor-pointer"
                                                >
                                                    {myGroupList.length > 0 && (
                                                        <optgroup label="⭐ МОИ ГРУППЫ">
                                                            {myGroupList.map((g) => {
                                                                const match = calculateAgeMatch(childAge, birthYear, g);
                                                                return (
                                                                    <option key={g.id} value={g.id}>
                                                                        {match.isMatch ? '🌟 ' : ''}{g.name} {match.isMatch ? `(${match.reason})` : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </optgroup>
                                                    )}

                                                    {colleagueGroupList.length > 0 && (
                                                        <optgroup label="👥 ПЕРЕВОД ДРУГОМУ ТРЕНЕРУ">
                                                            {colleagueGroupList.map((g) => (
                                                                <option key={g.id} value={g.id}>
                                                                    {g.name} — Тренер: {g.coachName || g.coach || 'Коллега'}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Transfer Reason Field (Visible only if colleague group is selected) */}
                                            {isColleagueGroup && (
                                                <div className="space-y-1 animate-in fade-in duration-200">
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">
                                                        Причина перевода коллеге:
                                                    </label>
                                                    <textarea
                                                        value={transferNoteMap[applicant.id] || ''}
                                                        onChange={(e) => setTransferNoteMap(prev => ({ ...prev, [applicant.id]: e.target.value }))}
                                                        placeholder="Укажите причину (уровень подготовки, график, район)..."
                                                        rows={2}
                                                        className="w-full bg-black/60 border border-teal-500/30 focus:border-teal-400 rounded-xl p-2.5 text-xs text-white placeholder-white/30 outline-none resize-none transition-colors"
                                                    />
                                                </div>
                                            )}

                                            {/* Action Buttons: Enroll / Transfer & Archive */}
                                            <div className="flex items-center gap-2 pt-1">
                                                {isColleagueGroup ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTransferToColleague(applicant)}
                                                        disabled={isEnrolling || !selectedGroupId}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isEnrolling ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <ChevronRight size={14} />
                                                        )}
                                                        <span>Передать в состав коллеги</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEnroll(applicant)}
                                                        disabled={isEnrolling || !selectedGroupId}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                                    >
                                                        {isEnrolling ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trophy size={14} />
                                                        )}
                                                        <span>Зачислить в мой состав</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleArchive(applicant.id)}
                                                    disabled={isArchiving}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors border border-white/10 cursor-pointer shrink-0"
                                                    title="Отправить в архив"
                                                >
                                                    {isArchiving ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Archive size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Unregistered Parent Modal Dialog */}
            <AnimatePresence>
                {unregisteredModal.isOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                        <div className="fixed inset-0" onClick={() => setUnregisteredModal({ isOpen: false, applicantName: '', phone: '' })} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-md bg-[#141416] border border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5 z-10"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shrink-0">
                                    📞
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUnregisteredModal({ isOpen: false, applicantName: '', phone: '' })}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-russo text-white uppercase tracking-tight">
                                    Родитель еще не зарегистрирован
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                    Родитель спортсмена <span className="text-white font-bold">{unregisteredModal.applicantName}</span> пока не создал личный кабинет в приложении Спарты. Свяжитесь по телефону:
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white font-russo text-sm">
                                    <Phone size={15} className="text-sparta-gold" />
                                    <span>{unregisteredModal.phone}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setUnregisteredModal({ isOpen: false, applicantName: '', phone: '' })}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Закрыть
                                </button>

                                {unregisteredModal.phone && (
                                    <a
                                        href={`tel:${String(unregisteredModal.phone).replace(/\D/g, '')}`}
                                        className="flex-1 py-3 rounded-xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 text-center"
                                    >
                                        <Phone size={14} />
                                        <span>Позвонить</span>
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(TrialsTab);