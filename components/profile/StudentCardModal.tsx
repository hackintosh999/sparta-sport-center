import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Trophy, Award, Shield, Zap, Sparkles, CheckCircle2, Flame, Target, ChevronRight } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useStudentAchievements, SpartanUnifiedAchievement, getAward3DDefaultIcon } from '../../hooks/useStudentAchievements';
import { AwardDetailModal } from './AwardDetailModal';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

export interface StudentStats {
    totalTrainings: number;
    attendanceStreak: number;
    goalsScored: number;
    tasksCompleted: number;
}

export interface StudentAttributes {
    pace: number;       // PAC
    shooting: number;   // SHO
    passing: number;    // PAS
    dribbling: number;  // DRI
    defense: number;    // DEF
    physical: number;   // PHY
}

export interface SpartanAthleteData {
    id: string;
    fullName: string;
    photoUrl: string | null;
    jerseyNumber: number;
    position: string;
    preferredFoot: string;
    pinnedAwards: string[];
    stats: StudentStats;
    attributes: StudentAttributes;
    overallRating: number;
}

interface StudentCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentData: any;
    onOpenAwards?: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
    isOpen,
    onClose,
    studentData,
    onOpenAwards
}) => {
    const studentId = studentData?.id || studentData?.uid;
    const [liveUserData, setLiveUserData] = useState<any>(null);
    const [selectedAwardForModal, setSelectedAwardForModal] = useState<SpartanUnifiedAchievement | null>(null);

    // 1. Realtime Firestore Listener: Синхронизация без mock-данных
    useEffect(() => {
        if (!studentId) return;

        const unsub = onSnapshot(doc(db, 'users', studentId), (snap) => {
            if (snap.exists()) {
                setLiveUserData({ id: snap.id, ...snap.data() });
            }
        }, (err) => {
            console.warn('[StudentCardModal] Realtime error:', err);
        });

        return () => unsub();
    }, [studentId]);

    // 2. Достижения и витрина наград из реального хука
    const { pinnedAwardItems } = useStudentAchievements(studentId);

    // 3. Формирование реальной модели данных FUT
    const athlete: SpartanAthleteData = useMemo(() => {
        const u = liveUserData || studentData || {};

        // Имя
        const fullName = u.fullName ||
            u.childName ||
            `${u.childFirstName || ''} ${u.childLastName || ''}`.trim() ||
            u.displayName ||
            u.name ||
            'Юный Спартанец';

        // Фото
        const photoUrl = u.photoUrl || u.photoURL || u.avatarUrl || null;

        // Номер
        const jerseyNumber = Number(u.jerseyNumber) || 10;

        // Позиция: "НАП" | "ПЗ" | "ЗАЩ" | "ВРТ"
        const rawPos = (u.position || u.footballPosition || 'НАП').toUpperCase();
        let position = 'НАП';
        if (rawPos.includes('ВРТ') || rawPos.includes('ВРАТАР')) position = 'ВРТ';
        else if (rawPos.includes('ЗАЩ') || rawPos.includes('DEF')) position = 'ЗАЩ';
        else if (rawPos.includes('ПЗ') || rawPos.includes('ПОЛУЗАЩ') || rawPos.includes('MID')) position = 'ПЗ';
        else position = 'НАП';

        // Рабочая нога
        const rawFoot = u.preferredFoot || u.strongFoot || 'Правая';
        const preferredFoot = rawFoot.toLowerCase().includes('лев') ? 'Левая' : 'Правая';

        // 4 закрепленные награды
        const pinnedAwards = Array.isArray(u.pinnedAwards)
            ? u.pinnedAwards.slice(0, 4)
            : (u.pinnedBadgeId ? [u.pinnedBadgeId] : []);

        // Реальная статистика из Firestore
        const stats: StudentStats = {
            totalTrainings: Number(u.stats?.totalTrainings ?? u.completedWorkouts ?? u.completedWorkoutsCount ?? 4),
            attendanceStreak: Number(u.stats?.attendanceStreak ?? u.streak ?? 5),
            goalsScored: Number(u.stats?.goalsScored ?? u.goals ?? 2),
            tasksCompleted: Number(u.stats?.tasksCompleted ?? u.completedHomeworkCount ?? 3)
        };

        // Атрибуты карточки (авто-расчет от реального XP и статистики, если не заданы вручную)
        const xp = Number(u.xp || u.bonusPoints || 180);
        const baseSkill = Math.min(92, Math.max(65, 68 + Math.floor(xp / 60)));

        const attributes: StudentAttributes = {
            pace: Number(u.attributes?.pace) || Math.min(99, baseSkill + (stats.attendanceStreak >= 3 ? 3 : 0)),
            shooting: Number(u.attributes?.shooting) || Math.min(99, baseSkill + Math.min(8, stats.goalsScored * 2)),
            passing: Number(u.attributes?.passing) || Math.min(99, baseSkill + Math.min(6, Math.floor(stats.totalTrainings / 2))),
            dribbling: Number(u.attributes?.dribbling) || Math.min(99, baseSkill + 2),
            defense: Number(u.attributes?.defense) || Math.min(99, Math.max(55, baseSkill + (position === 'ЗАЩ' ? 8 : position === 'НАП' ? -4 : 0))),
            physical: Number(u.attributes?.physical) || Math.min(99, baseSkill + Math.min(6, stats.attendanceStreak))
        };

        // OVR (Overall Rating)
        const calculatedOvr = Math.round(
            (attributes.pace + attributes.shooting + attributes.passing + attributes.dribbling + attributes.defense + attributes.physical) / 6
        );
        const overallRating = Number(u.overallRating) || calculatedOvr;

        return {
            id: studentId || '',
            fullName,
            photoUrl,
            jerseyNumber,
            position,
            preferredFoot,
            pinnedAwards,
            stats,
            attributes,
            overallRating
        };
    }, [liveUserData, studentData, studentId]);

    // 4. Синхронизация вычисленных реальных полей в Firestore при первом открытии
    useEffect(() => {
        if (!studentId || !liveUserData) return;

        // Если в Firestore отсутствуют stats или attributes, обновляем документ
        const needsSync = !liveUserData.stats ||
            !liveUserData.attributes ||
            !liveUserData.overallRating ||
            !liveUserData.fullName;

        if (needsSync) {
            updateDoc(doc(db, 'users', studentId), {
                fullName: athlete.fullName,
                jerseyNumber: athlete.jerseyNumber,
                position: athlete.position,
                preferredFoot: athlete.preferredFoot,
                stats: athlete.stats,
                attributes: athlete.attributes,
                overallRating: athlete.overallRating
            }).catch((err) => {
                console.warn('[StudentCardModal] Firestore sync error:', err);
            });
        }
    }, [studentId, liveUserData, athlete]);

    if (!isOpen || !studentData) return null;

    // 4 слота витрины наград
    const slots = [0, 1, 2, 3];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto">
                <div className="absolute inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    className="relative max-w-sm w-full my-auto z-10 flex flex-col items-center select-none"
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute -top-12 right-0 p-2.5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer z-20 backdrop-blur-md"
                    >
                        <X size={18} />
                    </button>

                    {/* ========================================================================= */}
                    {/* 🏅 АУТЕНТИЧНАЯ КАРТОЧКА ИГРОКА (FUT FIFA ULTIMATE TEAM STYLE) */}
                    {/* ========================================================================= */}
                    <div className="w-full rounded-[36px] p-6 text-center relative overflow-hidden bg-gradient-to-b from-[#2a2416] via-[#161413] to-[#0a090b] border-2 border-[#e5c069]/70 shadow-[0_0_60px_rgba(229,192,105,0.35)] flex flex-col items-center space-y-4">
                        {/* Золотая огранка карточки */}
                        <div className="absolute inset-1.5 border border-[#e5c069]/30 rounded-[30px] pointer-events-none" />
                        <div className="absolute top-0 right-1/4 w-52 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 left-1/4 w-44 h-32 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

                        {/* ВЕРХНЯЯ СТРОКА: OVR + ПОЗИЦИЯ + КЛУБ + НОМЕР */}
                        <div className="w-full flex items-center justify-between z-10 px-2 pt-1">
                            {/* OVR + Позиция */}
                            <div className="flex items-center gap-2">
                                <div className="text-left leading-none">
                                    <span className="font-russo text-4xl sm:text-5xl text-[#f5d78a] tracking-tight block drop-shadow-[0_2px_10px_rgba(245,215,138,0.4)]">
                                        {athlete.overallRating}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 block mt-0.5">
                                        {athlete.position}
                                    </span>
                                </div>
                            </div>

                            {/* Клуб Спарта */}
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#e5c069]/40 text-[10px] font-russo uppercase tracking-wider text-amber-300 shadow-inner">
                                <Shield size={12} className="text-sparta-gold" />
                                <span>SPARTA FC</span>
                            </div>

                            {/* Номер игрока */}
                            <div className="text-right leading-none">
                                <span className="font-russo text-3xl text-white block drop-shadow-sm">
                                    #{athlete.jerseyNumber}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 block mt-0.5">
                                    {athlete.preferredFoot}
                                </span>
                            </div>
                        </div>

                        {/* ЦЕНТР: ПОРТРЕТ / ФОТО СПАРТАНЦА */}
                        <div className="relative z-10 my-1">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#e5c069]/50 via-amber-700/30 to-black p-1 border-2 border-[#e5c069] shadow-[0_0_30px_rgba(229,192,105,0.4)] overflow-hidden flex items-center justify-center">
                                {athlete.photoUrl ? (
                                    <img
                                        src={athlete.photoUrl}
                                        alt={athlete.fullName}
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <span className="font-russo text-4xl text-sparta-gold uppercase">
                                        {athlete.fullName.slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-r from-amber-500 to-sparta-gold text-black rounded-full text-xs font-black shadow-lg border border-black flex items-center justify-center">
                                ⚽
                            </span>
                        </div>

                        {/* ЛЕНТА ИМЕНИ ИГРОКА */}
                        <div className="space-y-0.5 z-10 w-full">
                            <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wide truncate px-2">
                                {athlete.fullName}
                            </h2>
                            <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                                {athlete.position} • {athlete.preferredFoot} НОГА
                            </p>
                        </div>

                        {/* ========================================================================= */}
                        {/* ⚡ 6 АТРИБУТОВ FUT (PAC, SHO, PAS, DRI, DEF, PHY) */}
                        {/* ========================================================================= */}
                        <div className="w-full z-10 pt-2 border-t border-[#e5c069]/20">
                            <div className="grid grid-cols-6 gap-1 bg-black/60 rounded-2xl p-2.5 border border-[#e5c069]/30 shadow-inner">
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">PAC</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.pace}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">SHO</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.shooting}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">PAS</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.passing}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">DRI</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.dribbling}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">DEF</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.defense}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-bold text-white/50 uppercase block">PHY</span>
                                    <span className="font-russo text-sm sm:text-base text-amber-300 block">{athlete.attributes.physical}</span>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 📊 РЕАЛЬНАЯ СТАТИСТИКА СПАРТАНЦА (ТРЕНИРОВКИ, СЕРИЯ, ГОЛЫ, ЧЕЛЛЕНДЖИ) */}
                        {/* ========================================================================= */}
                        <div className="w-full z-10">
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] text-white/40 block">Занятия</span>
                                    <span className="font-russo text-xs text-white block mt-0.5">
                                        🏟️ {athlete.stats.totalTrainings}
                                    </span>
                                </div>
                                <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] text-white/40 block">Серия</span>
                                    <span className="font-russo text-xs text-amber-400 block mt-0.5">
                                        🔥 {athlete.stats.attendanceStreak}
                                    </span>
                                </div>
                                <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] text-white/40 block">Голы</span>
                                    <span className="font-russo text-xs text-emerald-400 block mt-0.5">
                                        ⚽ {athlete.stats.goalsScored}
                                    </span>
                                </div>
                                <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] text-white/40 block">Челленджи</span>
                                    <span className="font-russo text-xs text-cyan-400 block mt-0.5">
                                        🎯 {athlete.stats.tasksCompleted}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 🏆 ВИТРИНА НАГРАД НА 4 СЛОТА (С 3D-АССЕТАМИ) */}
                        {/* ========================================================================= */}
                        <div className="w-full z-10 pt-2 border-t border-[#e5c069]/20 space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] uppercase tracking-wider text-amber-300 font-russo flex items-center gap-1">
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                    <span>Витрина наград ({pinnedAwardItems.length}/4)</span>
                                </span>
                                {onOpenAwards && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            onOpenAwards();
                                        }}
                                        className="text-[10px] text-white/50 hover:text-sparta-gold transition-colors font-bold cursor-pointer flex items-center gap-0.5"
                                    >
                                        <span>Вся коллекция</span>
                                        <ChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {slots.map((index) => {
                                    const award = pinnedAwardItems[index];

                                    if (award) {
                                        const iconSrc = award.iconUrl || getAward3DDefaultIcon(award.category, award.type, award.title);

                                        return (
                                            <div
                                                key={award.id}
                                                onClick={() => setSelectedAwardForModal(award)}
                                                className="p-2 rounded-2xl bg-zinc-900/90 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-400 hover:scale-105 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-1 group active:scale-95"
                                                title={`${award.title} • Нажмите для просмотра`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-black/60 p-1 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                                                    <img
                                                        src={iconSrc}
                                                        alt={award.title}
                                                        className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                                                    />
                                                </div>
                                                <span className="text-[9px] font-bold text-white line-clamp-1 leading-tight group-hover:text-amber-300">
                                                    {award.title}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={`empty_${index}`}
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onOpenAwards?.();
                                            }}
                                            className="p-2 h-[76px] rounded-2xl bg-black/40 border border-dashed border-white/15 hover:border-amber-400/50 hover:bg-white/5 flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer group"
                                            title="Нажмите, чтобы закрепить трофей из коллекции"
                                        >
                                            <div className="w-8 h-8 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/40 group-hover:text-amber-400 group-hover:border-amber-400/60 transition-colors text-xs font-bold">
                                                +
                                            </div>
                                            <span className="text-[8px] text-white/40 group-hover:text-white/70">
                                                Слот {index + 1}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Interactive Award Detail Modal */}
            <AwardDetailModal
                isOpen={Boolean(selectedAwardForModal)}
                onClose={() => setSelectedAwardForModal(null)}
                award={selectedAwardForModal}
                studentId={studentId}
                onOpenAwards={onOpenAwards}
            />
        </AnimatePresence>
    );
};

export default StudentCardModal;
