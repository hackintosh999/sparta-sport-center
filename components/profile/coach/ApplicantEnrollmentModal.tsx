import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Trophy,
    Layers,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { db } from '../../../firebase';
import {
    doc,
    writeBatch,
    serverTimestamp,
    collection
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { calculateAgeMatch, TrialRequest } from './TrialsTab';

export interface ApplicantEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicant: TrialRequest | null;
    myGroups: any[];
    allGroups: any[];
    user?: any;
    userProfile?: any;
    onSuccess?: (applicant: TrialRequest, groupId: string, isTransfer: boolean) => void;
}

export const ApplicantEnrollmentModal: React.FC<ApplicantEnrollmentModalProps> = ({
    isOpen,
    onClose,
    applicant,
    myGroups = [],
    allGroups = [],
    user,
    userProfile,
    onSuccess
}) => {
    const currentCoachId = user?.uid || userProfile?.coachId || userProfile?.id || '';
    const currentCoachName = userProfile?.name || userProfile?.full_name || 'Тренер';

    // 1. Split groups into "My Groups" and "Colleague Groups"
    const { myGroupList, colleagueGroupList } = useMemo(() => {
        const pool = allGroups && allGroups.length > 0 ? allGroups : myGroups;
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

        if (my.length === 0 && myGroups.length > 0) {
            my.push(...myGroups);
        }

        return { myGroupList: my, colleagueGroupList: colleague };
    }, [allGroups, myGroups, currentCoachId, currentCoachName]);

    // 2. Auto-match best group for applicant by age
    const defaultGroupId = useMemo(() => {
        if (!applicant) return '';
        const childAge = applicant.childAge || applicant.age;
        const birthYear = applicant.birthYear || applicant.childBirthYear;

        // Try in my groups first
        const myMatch = myGroupList.find(g => calculateAgeMatch(childAge, birthYear, g).isMatch);
        if (myMatch) return myMatch.id;

        // Fallback to first in my groups
        if (myGroupList.length > 0) return myGroupList[0].id;

        // Otherwise colleague match
        const colleagueMatch = colleagueGroupList.find(g => calculateAgeMatch(childAge, birthYear, g).isMatch);
        if (colleagueMatch) return colleagueMatch.id;

        return colleagueGroupList[0]?.id || '';
    }, [applicant, myGroupList, colleagueGroupList]);

    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [transferNote, setTransferNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync default group on open/change
    React.useEffect(() => {
        if (isOpen && applicant) {
            setSelectedGroupId(defaultGroupId);
            setTransferNote('');
        }
    }, [isOpen, applicant, defaultGroupId]);

    if (!isOpen || !applicant) return null;

    const childFullName = [
        applicant.childSurname,
        applicant.childName || applicant.name
    ].filter(Boolean).join(' ') || 'Новый спортсмен';

    const childAge = applicant.childAge || applicant.age;
    const birthYear = applicant.birthYear || applicant.childBirthYear;
    const parentFullName = applicant.parentName || applicant.parentDisplayName;
    const rawPhone = applicant.parentPhone || applicant.phone || '';

    const effectiveGroupId = selectedGroupId || defaultGroupId;
    const isColleagueGroup = colleagueGroupList.some(g => g.id === effectiveGroupId);
    const selectedGroup = [...myGroupList, ...colleagueGroupList].find(g => g.id === effectiveGroupId);
    const ageMatchInfo = calculateAgeMatch(childAge, birthYear, selectedGroup);

    // Submission Handler (Enroll vs Transfer)
    const handleSubmit = async () => {
        if (!effectiveGroupId) {
            alert('Пожалуйста, выберите целевую группу');
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);

            if (isColleagueGroup) {
                // Transfer to colleague
                const reason = transferNote.trim() || 'Перевод в группу коллеги';
                const targetCoachId = selectedGroup?.coachId || selectedGroup?.coach || '';

                const requestRef = doc(db, 'requests', applicant.id);
                batch.update(requestRef, {
                    coachId: targetCoachId,
                    assignedCoachId: targetCoachId,
                    groupId: effectiveGroupId,
                    assignedGroupId: effectiveGroupId,
                    status: 'transferred',
                    transferredFrom: currentCoachName,
                    transferredFromId: currentCoachId,
                    transferNote: reason,
                    transferredAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                if (applicant.chatId) {
                    const msgRef = doc(collection(db, 'chats', applicant.chatId, 'messages'));
                    batch.set(msgRef, {
                        text: `Заявка перенаправлена тренеру группы "${selectedGroup?.name || 'Sparta'}". Причина: ${reason}`,
                        senderId: currentCoachId,
                        createdAt: serverTimestamp(),
                        type: 'system'
                    });
                }

                await batch.commit();
                if (onSuccess) onSuccess(applicant, effectiveGroupId, true);
                onClose();
            } else {
                // Direct enrollment into my group
                const studentId = `student_${applicant.id}_${Date.now()}`;
                const targetCoachId = selectedGroup?.coachId || currentCoachId;

                const studentRef = doc(db, 'students', studentId);
                batch.set(studentRef, {
                    name: applicant.childName || applicant.name || 'Новый ученик',
                    surname: applicant.childSurname || '',
                    phone: applicant.phone || applicant.parentPhone || '',
                    parentName: applicant.parentName || applicant.parentDisplayName || '',
                    email: (applicant as any).email || '',
                    groupId: effectiveGroupId,
                    coachId: targetCoachId,
                    type: applicant.isMembership ? 'regular' : 'trial',
                    status: 'active',
                    createdAt: serverTimestamp(),
                    trialRequestId: applicant.id,
                    experienceLevel: applicant.experienceLevel || applicant.level || 'beginner',
                    birthYear: applicant.birthYear || applicant.childBirthYear || null,
                    age: applicant.childAge || applicant.age || null
                });

                const requestRef = doc(db, 'requests', applicant.id);
                batch.update(requestRef, {
                    status: 'accepted',
                    enrolledAt: serverTimestamp(),
                    assignedGroupId: effectiveGroupId,
                    assignedCoachId: targetCoachId
                });

                await batch.commit();

                try {
                    confetti({
                        particleCount: 80,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } catch {}

                if (onSuccess) onSuccess(applicant, effectiveGroupId, false);
                onClose();
            }
        } catch (err) {
            console.error('Error in enrollment/transfer:', err);
            alert('Произошла ошибка при обработке заявки');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md pt-safe pb-safe">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-[#141417] border border-white/10 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-7 shadow-2xl text-left space-y-4 sm:space-y-5 max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 shrink-0">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🏆</span>
                            <h3 className="text-lg sm:text-xl font-black font-russo uppercase text-white tracking-wide">
                                {isColleagueGroup ? 'Перевод новичка коллеге' : 'Зачисление в группу'}
                            </h3>
                        </div>
                        <p className="text-xs text-white/50">
                            Прямое распределение в состав в 2 клика без скаутинга
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Applicant Summary Banner */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-bold text-white font-russo uppercase truncate">
                            {childFullName}
                        </h4>
                        {childAge && (
                            <span className="text-xs font-semibold text-sparta-gold shrink-0">
                                {childAge} лет {birthYear ? `(${birthYear} г.р.)` : ''}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-white/60 gap-1">
                        <span>Родитель: {parentFullName || '—'}</span>
                        {rawPhone && <span>{rawPhone}</span>}
                    </div>
                </div>

                {/* Group Selector Form */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Layers size={13} className="text-sparta-gold" /> Выберите целевую группу:
                        </span>
                        {ageMatchInfo.isMatch && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                🌟 {ageMatchInfo.reason}
                            </span>
                        )}
                    </label>

                    <select
                        value={effectiveGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 focus:border-sparta-gold rounded-2xl p-3.5 text-xs text-white font-bold outline-none cursor-pointer transition-all"
                    >
                        {myGroupList.length > 0 && (
                            <optgroup label="⭐ МОИ ГРУППЫ">
                                {myGroupList.map(g => {
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
                                {colleagueGroupList.map(g => (
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
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">
                            Причина перевода коллеге:
                        </label>
                        <textarea
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            placeholder="Например: удобнее тренироваться в выходные / уровень подготовки..."
                            rows={3}
                            className="w-full bg-[#121817] border border-teal-500/30 focus:border-teal-400 rounded-2xl p-3 text-xs text-white placeholder-white/30 outline-none resize-none transition-colors"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider transition-all text-center cursor-pointer"
                    >
                        Отмена
                    </button>

                    {isColleagueGroup ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !effectiveGroupId}
                            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <ArrowRight size={16} />
                            )}
                            <span>Передать в состав коллеги</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !effectiveGroupId}
                            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-sparta-gold/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Trophy size={16} />
                            )}
                            <span>Зачислить в мой состав</span>
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ApplicantEnrollmentModal;
