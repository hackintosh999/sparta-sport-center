import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, updateDoc, getDocs } from 'firebase/firestore';
import { safeLocalStorage } from '../utils/storage';
import confetti from 'canvas-confetti';

export type AwardCategoryType = 'medal' | 'cup' | 'certificate' | 'streak' | 'milestone' | 'achievement';

export interface SpartanUnifiedAchievement {
    id: string;
    icon: string;
    iconUrl?: string;
    title: string;
    subtitle?: string;
    description: string;
    remainingRequirement?: string;
    type: AwardCategoryType;
    category?: AwardCategoryType;
    catalogType?: 'awards_catalog' | 'achievements_catalog';
    canPinToProfile: boolean; // TRUE for awards_catalog, FALSE for achievements_catalog
    unlocked: boolean;
    unlockedAt?: string | number | null;
    progress?: { current: number; max: number; unit?: string };
    rewardCoins: number;
    rewardXp: number;
    confirmedByCoach: string;
    isPinned?: boolean;
    isPinnedInProfile?: boolean;
    isNew?: boolean;
}

// 🖼️ Набор качественных 3D-ассетов наград
export const DEFAULT_AWARD_3D_ASSETS = {
    goldCup: '/assets/awards/3d/gold_cup.jpg',
    silverCup: '/assets/awards/3d/silver_cup.jpg',
    goldMedal: '/assets/awards/3d/gold_medal.jpg',
    silverMedal: '/assets/awards/3d/silver_medal.jpg',
    certificate: '/assets/awards/3d/certificate.jpg'
};

export function getAward3DDefaultIcon(category?: string, type?: string, title?: string): string {
    const cat = (category || type || '').toLowerCase();
    const t = (title || '').toLowerCase();

    if (cat === 'cup') {
        return t.includes('серебр') || t.includes('дух') ? DEFAULT_AWARD_3D_ASSETS.silverCup : DEFAULT_AWARD_3D_ASSETS.goldCup;
    }
    if (cat === 'certificate') {
        return DEFAULT_AWARD_3D_ASSETS.certificate;
    }
    if (cat === 'medal') {
        return t.includes('серебр') || t.includes('первый гол') ? DEFAULT_AWARD_3D_ASSETS.silverMedal : DEFAULT_AWARD_3D_ASSETS.goldMedal;
    }
    return DEFAULT_AWARD_3D_ASSETS.goldMedal;
}

// 🏆 1. ТРОФЕИ ДЛЯ ВИТРИНЫ (awards_catalog - canPinToProfile: true)
// Назначение: выдаются вручную тренером/клубом за турниры и особые заслуги
export const DEFAULT_AWARDS: SpartanUnifiedAchievement[] = [
    // 🏅 МЕДАЛИ (Именные медали турниров)
    {
        id: 'first_step',
        icon: '⚽',
        iconUrl: '/assets/awards/3d/gold_medal.jpg',
        title: 'Первый шаг в Спарту',
        subtitle: 'Первая тренировка в клубе',
        description: 'Начало спортивного пути в футбольной академии SPARTA. Твой первый уверенный шаг к чемпионству!',
        type: 'medal',
        category: 'medal',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: true,
        unlockedAt: Date.now() - 30 * 86400000,
        rewardCoins: 30,
        rewardXp: 50,
        confirmedByCoach: 'Александр Смирнов (Главный тренер SPARTA)'
    },
    {
        id: 'first_goal',
        icon: '🎯',
        iconUrl: '/assets/awards/3d/silver_medal.jpg',
        title: 'Первый гол',
        subtitle: 'Забитый мяч в игре на турнире',
        description: 'Забей красивый и решающий гол на тренировочном матче или официальном соревновании клуба.',
        type: 'medal',
        category: 'medal',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: true,
        unlockedAt: Date.now() - 14 * 86400000,
        rewardCoins: 35,
        rewardXp: 50,
        confirmedByCoach: 'Александр Смирнов (Главный тренер SPARTA)'
    },
    {
        id: 'spartan_honor',
        icon: '🎖️',
        iconUrl: '/assets/awards/3d/gold_medal.jpg',
        title: 'Медаль чести Спарты',
        subtitle: 'Особая награда тренерского штаба',
        description: 'Почетная медаль клуба за образцовое поведение, благородство на поле и преданность команде.',
        type: 'medal',
        category: 'medal',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 50,
        rewardXp: 80,
        confirmedByCoach: 'Тренерский штаб SPARTA'
    },

    // 🏆 КУБКИ КОМАНДЫ (Командные победы и турниры)
    {
        id: 'team_captain',
        icon: '👑',
        iconUrl: '/assets/awards/3d/gold_cup.jpg',
        title: 'Капитан команды',
        subtitle: 'Лидерство и поддержка партнеров на поле',
        description: 'Прояви лидерские качества на поле, поддержи партнера по команде и приведи команду к победе.',
        type: 'cup',
        category: 'cup',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 50,
        rewardXp: 100,
        confirmedByCoach: 'Александр Смирнов (Главный тренер SPARTA)'
    },
    {
        id: 'spartan_cup_gold',
        icon: '🏆',
        iconUrl: '/assets/awards/3d/gold_cup.jpg',
        title: 'Кубок Спартанца',
        subtitle: '1-е место во внутреннем первенстве',
        description: 'Завоюй золотую медаль и кубок чемпиона в составе своей возрастной группы на кубке SPARTA.',
        type: 'cup',
        category: 'cup',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 100,
        rewardXp: 150,
        confirmedByCoach: 'Судейская коллегия SPARTA'
    },
    {
        id: 'spartan_spirit',
        icon: '🛡️',
        iconUrl: '/assets/awards/3d/silver_cup.jpg',
        title: 'Дух Спарты',
        subtitle: 'Максимальная самоотдача в финальной игре',
        description: 'Покажи несгибаемую волю к победе и командную взаимовыручку в решающей игре сезона.',
        type: 'cup',
        category: 'cup',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 60,
        rewardXp: 80,
        confirmedByCoach: 'Тренерский штаб SPARTA'
    },

    // 📜 ГРАМОТЫ ОТ ТРЕНЕРА (Особые отличия клуба)
    {
        id: 'effort_diploma',
        icon: '📜',
        iconUrl: '/assets/awards/3d/certificate.jpg',
        title: 'Грамота за старание',
        subtitle: 'Лучший прогресс месяца',
        description: 'Официальная грамота от главного тренера за образцовую работу над ошибками и прилежание.',
        type: 'certificate',
        category: 'certificate',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: true,
        unlockedAt: Date.now() - 7 * 86400000,
        rewardCoins: 50,
        rewardXp: 80,
        confirmedByCoach: 'Александр Смирнов (Главный тренер SPARTA)'
    },
    {
        id: 'streak_diploma',
        icon: '🎖️',
        iconUrl: '/assets/awards/3d/certificate.jpg',
        title: 'Диплом спартанца месяца',
        subtitle: 'Посещение всех занятий сезона',
        description: 'Именной диплом академии SPARTA за 100% посещаемость всех тренировочных сборов месяца.',
        type: 'certificate',
        category: 'certificate',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 75,
        rewardXp: 120,
        confirmedByCoach: 'Руководство академии SPARTA'
    },
    {
        id: 'fair_play_diploma',
        icon: '🤝',
        iconUrl: '/assets/awards/3d/certificate.jpg',
        title: 'Грамота Fair Play',
        subtitle: 'Честная игра и уважение',
        description: 'Награда за безупречную честную игру, уважение к соперникам и судьям турнира.',
        type: 'certificate',
        category: 'certificate',
        catalogType: 'awards_catalog',
        canPinToProfile: true,
        unlocked: false,
        rewardCoins: 40,
        rewardXp: 60,
        confirmedByCoach: 'Судейская коллегия SPARTA'
    }
];

// ⚡ 2. СПОРТИВНЫЕ ДОСТИЖЕНИЯ И ЧЕЛЛЕНДЖИ (achievements_catalog - canPinToProfile: false)
// Назначение: личный прогресс-бар, дает монеты/XP, не идет в слоты наград
export const DEFAULT_ACHIEVEMENTS: SpartanUnifiedAchievement[] = [
    {
        id: 'juggler_master',
        icon: '⚡',
        title: 'Мастер чеканки',
        subtitle: 'Чеканка мяча 15 раз без падения',
        description: 'Набей футбольный мяч 15 раз подряд обеими ногами без падения на газон на тренировке.',
        remainingRequirement: 'Осталось набить 3 раза',
        type: 'milestone',
        category: 'milestone',
        catalogType: 'achievements_catalog',
        canPinToProfile: false,
        unlocked: false,
        progress: { current: 12, max: 15, unit: 'раз' },
        rewardCoins: 45,
        rewardXp: 70,
        confirmedByCoach: 'Тренер по технике SPARTA'
    },
    {
        id: 'speed_dribbler',
        icon: '👟',
        title: 'Реактивный дриблер',
        subtitle: 'Обводка 5 конусов на время',
        description: 'Пройди тренировочную полосу препятствий с мячом менее чем за 12 секунд.',
        remainingRequirement: 'Осталось улучшить время на 1.5 сек',
        type: 'milestone',
        category: 'milestone',
        catalogType: 'achievements_catalog',
        canPinToProfile: false,
        unlocked: false,
        progress: { current: 10, max: 12, unit: 'сек' },
        rewardCoins: 40,
        rewardXp: 60,
        confirmedByCoach: 'Тренер по физподготовке SPARTA'
    },
    {
        id: 'iron_character',
        icon: '🔥',
        title: 'Железный характер',
        subtitle: '3 тренировки без пропуска',
        description: 'Норматив за выдающуюся дисциплину: 3 тренировки подряд без единого пропуска.',
        remainingRequirement: 'Выполнено в этом сезоне',
        type: 'streak',
        category: 'streak',
        catalogType: 'achievements_catalog',
        canPinToProfile: false,
        unlocked: true,
        unlockedAt: Date.now() - 2 * 3600000,
        progress: { current: 3, max: 3, unit: 'тренировок' },
        rewardCoins: 40,
        rewardXp: 60,
        confirmedByCoach: 'Тренерский штаб SPARTA'
    },
    {
        id: 'sniper_shots',
        icon: '🎯',
        title: 'Снайпер Спарты',
        subtitle: '10 попаданий в девятку',
        description: 'Выполни серию из 10 точных ударов в верхний угол ворот на тренировке по ударам.',
        remainingRequirement: 'Осталось 3 точных удара',
        type: 'milestone',
        category: 'milestone',
        catalogType: 'achievements_catalog',
        canPinToProfile: false,
        unlocked: false,
        progress: { current: 7, max: 10, unit: 'ударов' },
        rewardCoins: 50,
        rewardXp: 75,
        confirmedByCoach: 'Тренер по ударам SPARTA'
    },
    {
        id: 'marathon_streak',
        icon: '🏃',
        title: 'Спартанский марафон',
        subtitle: '10 тренировок подряд без пропусков',
        description: 'Подтверди звание истинного спартанца: регулярное посещение 10 тренировок клуба подряд.',
        remainingRequirement: 'Осталось 2 тренировки',
        type: 'streak',
        category: 'streak',
        catalogType: 'achievements_catalog',
        canPinToProfile: false,
        unlocked: false,
        progress: { current: 8, max: 10, unit: 'тренировок' },
        rewardCoins: 80,
        rewardXp: 120,
        confirmedByCoach: 'Руководство SPARTA'
    }
];

export const MAX_PINNED_SLOTS = 4;

export function useStudentAchievements(studentId?: string | null) {
    const [userDocData, setUserDocData] = useState<any>(null);
    const [userSubAchievements, setUserSubAchievements] = useState<any[]>([]);
    const [catalogAwards, setCatalogAwards] = useState<any[]>([]);
    const [catalogAchievements, setCatalogAchievements] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Initial cache from safeLocalStorage (up to 4 slots)
    const [pinnedAwards, setPinnedAwards] = useState<string[]>(() => {
        try {
            const raw = safeLocalStorage.getItem('sparta_pinned_awards');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.slice(0, MAX_PINNED_SLOTS);
            }
            const single = safeLocalStorage.getItem('sparta_pinned_badge');
            return single ? [single] : ['first_step', 'first_goal', 'effort_diploma'];
        } catch {
            return ['first_step', 'first_goal', 'effort_diploma'];
        }
    });

    const [viewedBadgeIds, setViewedBadgeIds] = useState<string[]>(() => {
        try {
            const raw = safeLocalStorage.getItem('sparta_viewed_badges');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    // 1. Real-time User Document Listener
    useEffect(() => {
        if (!studentId) {
            setLoading(false);
            return;
        }

        const unsubUser = onSnapshot(doc(db, 'users', studentId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setUserDocData(data);
                if (Array.isArray(data.pinnedAwards)) {
                    setPinnedAwards(data.pinnedAwards.slice(0, MAX_PINNED_SLOTS));
                } else if (data.pinnedBadgeId) {
                    setPinnedAwards([data.pinnedBadgeId]);
                }
            }
            setLoading(false);
        }, (err) => {
            console.warn('[useStudentAchievements] User snapshot error:', err);
            setLoading(false);
        });

        return () => unsubUser();
    }, [studentId]);

    // 2. Real-time User Achievements Subcollection Listener
    useEffect(() => {
        if (!studentId) return;

        const unsubSubAchievements = onSnapshot(collection(db, 'users', studentId, 'user_achievements'), (snap) => {
            if (!snap.empty) {
                setUserSubAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        }, (err) => {
            console.warn('[useStudentAchievements] user_achievements snapshot error:', err);
        });

        return () => unsubSubAchievements();
    }, [studentId]);

    // 3. Real-time Firestore awards_catalog Listener (canPinToProfile: true)
    useEffect(() => {
        const unsubAwards = onSnapshot(collection(db, 'awards_catalog'), (snap) => {
            if (!snap.empty) {
                setCatalogAwards(snap.docs.map(d => ({ id: d.id, ...d.data(), canPinToProfile: true, catalogType: 'awards_catalog' })));
            }
        }, (err) => {
            console.warn('[useStudentAchievements] awards_catalog snapshot error:', err);
        });

        return () => unsubAwards();
    }, []);

    // 4. Real-time Firestore achievements_catalog Listener (canPinToProfile: false)
    useEffect(() => {
        const unsubAchievements = onSnapshot(collection(db, 'achievements_catalog'), (snap) => {
            if (!snap.empty) {
                setCatalogAchievements(snap.docs.map(d => ({ id: d.id, ...d.data(), canPinToProfile: false, catalogType: 'achievements_catalog' })));
            }
        }, (err) => {
            console.warn('[useStudentAchievements] achievements_catalog snapshot error:', err);
        });

        return () => unsubAchievements();
    }, []);

    // 5. Mark badge as viewed
    const markAsViewed = useCallback((id: string) => {
        if (!viewedBadgeIds.includes(id)) {
            const next = [...viewedBadgeIds, id];
            setViewedBadgeIds(next);
            try {
                safeLocalStorage.setItem('sparta_viewed_badges', JSON.stringify(next));
            } catch {}
        }
    }, [viewedBadgeIds]);

    // 6. Toggle Pin Award in Profile (Max 4 awards, ONLY from awards_catalog)
    const togglePinAward = useCallback(async (awardId: string): Promise<{ success: boolean; reason?: string }> => {
        const isCurrentlyPinned = pinnedAwards.includes(awardId);

        let nextPinned: string[];
        if (isCurrentlyPinned) {
            nextPinned = pinnedAwards.filter(id => id !== awardId);
        } else {
            if (pinnedAwards.length >= MAX_PINNED_SLOTS) {
                return { success: false, reason: 'limit_reached' };
            }
            nextPinned = [...pinnedAwards, awardId];
            confetti({
                particleCount: 45,
                spread: 60,
                origin: { y: 0.6 }
            });
        }

        setPinnedAwards(nextPinned);
        try {
            safeLocalStorage.setItem('sparta_pinned_awards', JSON.stringify(nextPinned));
            if (nextPinned[0]) {
                safeLocalStorage.setItem('sparta_pinned_badge', nextPinned[0]);
            }
        } catch {}

        if (studentId) {
            try {
                await updateDoc(doc(db, 'users', studentId), {
                    pinnedAwards: nextPinned,
                    pinnedBadgeId: nextPinned[0] || null
                });
            } catch (e) {
                console.warn('[useStudentAchievements] updateDoc pinnedAwards failed:', e);
            }
        }

        return { success: true };
    }, [pinnedAwards, studentId]);

    // Backward compatibility togglePin
    const togglePin = useCallback(async (badgeId: string) => {
        await togglePinAward(badgeId);
    }, [togglePinAward]);

    // 7. Combined Resolution with Clear Separation
    const allItems = useMemo<SpartanUnifiedAchievement[]>(() => {
        const userAchievements: any[] = Array.isArray(userDocData?.achievements) ? userDocData.achievements : [];
        const userBadges: any[] = Array.isArray(userDocData?.badges) ? userDocData.badges : [];
        const workoutsCount = Number(userDocData?.completedWorkouts || userDocData?.completedHomeworkCount || 3);

        const checkUnlocked = (id: string) => {
            return userAchievements.some(a => a.id === id || a.definitionId === id || a.awardId === id || a.title?.toLowerCase() === id) ||
                   userBadges.some(b => b.id === id || b.title?.toLowerCase() === id) ||
                   userSubAchievements.some(s => s.awardId === id || s.id === id || s.title?.toLowerCase() === id);
        };

        const getUnlockedDate = (id: string) => {
            const found = userSubAchievements.find(s => s.awardId === id || s.id === id) ||
                          userAchievements.find(a => a.id === id || a.definitionId === id || a.awardId === id) ||
                          userBadges.find(b => b.id === id);
            return found?.awardedAt || found?.unlockedAt || found?.date || found?.createdAt || null;
        };

        const combinedMap = new Map<string, SpartanUnifiedAchievement>();

        // Default awards (canPinToProfile: true)
        DEFAULT_AWARDS.forEach(item => {
            combinedMap.set(item.id, { ...item, canPinToProfile: true, catalogType: 'awards_catalog' });
        });

        // Firestore awards_catalog (canPinToProfile: true)
        catalogAwards.forEach(cat => {
            const category: AwardCategoryType = (cat.category === 'cup' || cat.category === 'certificate' || cat.category === 'medal')
                ? cat.category
                : 'medal';

            combinedMap.set(cat.id, {
                id: cat.id,
                title: cat.title,
                subtitle: cat.description,
                description: cat.description,
                type: category,
                category: category,
                catalogType: 'awards_catalog',
                canPinToProfile: true,
                iconUrl: cat.iconUrl || getAward3DDefaultIcon(category, cat.type, cat.title),
                icon: cat.icon || (category === 'cup' ? '🏆' : category === 'certificate' ? '📜' : '🏅'),
                unlocked: false,
                rewardCoins: Number(cat.rewardCoins) || 30,
                rewardXp: Number(cat.rewardXp) || 50,
                confirmedByCoach: cat.confirmedByCoach || 'Тренерский штаб SPARTA'
            });
        });

        // Default achievements (canPinToProfile: false)
        DEFAULT_ACHIEVEMENTS.forEach(item => {
            combinedMap.set(item.id, { ...item, canPinToProfile: false, catalogType: 'achievements_catalog' });
        });

        // Firestore achievements_catalog (canPinToProfile: false)
        catalogAchievements.forEach(ach => {
            const catType: AwardCategoryType = ach.type === 'streak' ? 'streak' : 'milestone';

            combinedMap.set(ach.id, {
                id: ach.id,
                title: ach.title,
                subtitle: ach.description || ach.subtitle,
                description: ach.description,
                remainingRequirement: ach.remainingRequirement,
                type: catType,
                category: catType,
                catalogType: 'achievements_catalog',
                canPinToProfile: false,
                iconUrl: ach.iconUrl,
                icon: ach.icon || (catType === 'streak' ? '🔥' : '⚡'),
                unlocked: false,
                progress: ach.progress,
                rewardCoins: Number(ach.rewardCoins) || 25,
                rewardXp: Number(ach.rewardXp) || 40,
                confirmedByCoach: ach.confirmedByCoach || 'Тренерский штаб SPARTA'
            });
        });

        return Array.from(combinedMap.values()).map(item => {
            const isUnlockedDirectly = checkUnlocked(item.id);
            const isWorkoutGoalMet = item.id === 'iron_character' && workoutsCount >= 3;
            const isUnlocked = item.unlocked || isUnlockedDirectly || isWorkoutGoalMet;

            const unlockedAt = getUnlockedDate(item.id) || item.unlockedAt;
            const isPinned = pinnedAwards.includes(item.id);
            const isNew = isUnlocked && !viewedBadgeIds.includes(item.id) && item.id === 'iron_character';

            return {
                ...item,
                unlocked: isUnlocked,
                unlockedAt,
                isPinned,
                isPinnedInProfile: isPinned,
                isNew
            };
        });
    }, [userDocData, userSubAchievements, catalogAwards, catalogAchievements, viewedBadgeIds, pinnedAwards]);

    const unlockedCount = useMemo(() => allItems.filter(a => a.unlocked).length, [allItems]);
    const totalCount = allItems.length;

    const pinnedBadgeId = pinnedAwards[0] || null;

    const pinnedBadge = useMemo(() => {
        if (!pinnedBadgeId) return null;
        return allItems.find(a => a.id === pinnedBadgeId && a.canPinToProfile) || null;
    }, [allItems, pinnedBadgeId]);

    // 🏅 The actual objects for up to 4 pinned awards (ONLY awards_catalog items)
    const pinnedAwardItems = useMemo<SpartanUnifiedAchievement[]>(() => {
        return pinnedAwards
            .map(id => allItems.find(a => a.id === id && a.canPinToProfile))
            .filter((item): item is SpartanUnifiedAchievement => Boolean(item))
            .slice(0, MAX_PINNED_SLOTS);
    }, [allItems, pinnedAwards]);

    // Split collections for UI
    const medals = useMemo(() => allItems.filter(a => (a.type === 'medal' || a.category === 'medal') && a.canPinToProfile), [allItems]);
    const cups = useMemo(() => allItems.filter(a => (a.type === 'cup' || a.category === 'cup') && a.canPinToProfile), [allItems]);
    const certificates = useMemo(() => allItems.filter(a => (a.type === 'certificate' || a.category === 'certificate') && a.canPinToProfile), [allItems]);
    const awardsList = useMemo(() => allItems.filter(a => a.canPinToProfile), [allItems]);
    const challenges = useMemo(() => allItems.filter(a => !a.canPinToProfile), [allItems]);

    return {
        achievements: allItems,
        awardsList,
        achievementsList: challenges,
        unlockedCount,
        totalCount,
        pinnedBadge,
        pinnedBadgeId,
        pinnedAwards,
        pinnedAwardItems,
        togglePin,
        togglePinAward,
        markAsViewed,
        medals,
        cups,
        certificates,
        challenges,
        loading
    };
}

export default useStudentAchievements;
