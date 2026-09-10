import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, getDocs, writeBatch, where, arrayUnion } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Save, Search, Users, RefreshCw, Upload, Calendar, Check, AlertTriangle, Download, Trophy, ChevronRight, Clock, LayoutGrid, List, FolderOpen, Settings, MapPin, Sparkles, SlidersHorizontal, Zap, ShieldAlert, ChevronDown, MoreHorizontal, MessageSquare, Send, UserCheck, ArrowRightLeft } from 'lucide-react';
import { Group, User, AchievementDefinition, UserAchievement } from '../../types/shop';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ExcelImportModal, ImportRow, MergeStrategy } from '../../components/admin/ExcelImportModal';
import { SavedListsModal } from '../../components/admin/SavedListsModal';
import { triggerScheduleSync } from '../../services/scheduleSync';
import { ScheduleOverrideModal } from '../../components/schedule/ScheduleOverrideModal';
import { ScheduleMessengerPublishModal } from '../../components/admin/ScheduleMessengerPublishModal';

// Helper to calculate age from birthdate string (DD.MM.YYYY) or just use existing age
const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0;
    // Try to parse DD.MM.YYYY
    const parts = birthDateStr.split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    return 0;
};

const getCoachPhoto = (coach: any): string | null => {
    if (coach?.photoUrl) return coach.photoUrl;
    const name = coach?.name || '';
    if (name.includes('Пономарев') || name.includes('Понамарев')) return '/sergey-ponomarev.png';
    if (name.includes('Якупов')) return '/pavel-yakupov-gold.png';
    if (name.includes('Кубарь')) return '/sergey-kubar-gold.png';
    if (name.includes('Глазунов')) return '/anton-glazunov.png';
    return null;
};

// Filter out non-coaching staff (directors, administrators) from coaching dropdowns
const isActualCoach = (coach: any): boolean => {
    if (!coach) return false;
    const name = (coach.name || '').toLowerCase();
    const role = (coach.role || coach.position || '').toLowerCase();
    if (
        name.includes('лебедева') ||
        name.includes('аксинья') ||
        name.includes('лариса') ||
        role.includes('директор') ||
        role.includes('администратор') ||
        role.includes('руководитель') ||
        role.includes('бухгалтер') ||
        role.includes('менеджер')
    ) {
        return false;
    }
    return true;
};

const AdminGroups = () => {
    // --- State ---
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
    const [registry, setRegistry] = useState<any[]>([]); // New Registry State
    const [overrides, setOverrides] = useState<any[]>([]); // Schedule Overrides State
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [mainTab, setMainTab] = useState<'GROUPS' | 'SCHEDULE' | 'OVERRIDES'>('GROUPS');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupFilterTab, setGroupFilterTab] = useState<'ALL' | 'WITH_PENDING' | 'NO_COACH' | 'HAS_FREE'>('ALL');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [drawerTab, setDrawerTab] = useState<'settings' | 'students'>('settings');
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
    const [scheduleCoachFilter, setScheduleCoachFilter] = useState<string>('ALL');
    const [scheduleLocationFilter, setScheduleLocationFilter] = useState<string>('ALL');
    const [isPublishMessengerModalOpen, setIsPublishMessengerModalOpen] = useState(false);
    const [publishMessengerTargetGroup, setPublishMessengerTargetGroup] = useState<Group | null>(null);

    const activeCoaches = useMemo(() => {
        const list = [...coaches.filter(isActualCoach)];
        users.filter(u => u.role === 'coach' || u.role === 'trainer').forEach(u => {
            const uName = (u.displayName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '').toLowerCase();
            const alreadyIn = list.some(c => 
                c.id === u.id || 
                (c.name && c.name.toLowerCase().includes(uName)) ||
                (uName && c.name && uName.includes(c.name.toLowerCase()))
            );
            if (!alreadyIn) {
                list.push({
                    id: u.id,
                    name: u.displayName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Тренер',
                    role: 'Тренер по футболу',
                    image: u.photoURL || u.image || getCoachPhoto(u) || '/sergey-ponomarev.png'
                });
            }
        });
        return list;
    }, [coaches, users]);

    // Editor State
    interface GroupFormData {
        name: string;
        minAge: string;
        maxAge: string;
        coachId: string;
        maxStudents: string;
        currentStatus: 'normal' | 'cancelled' | 'substitute';
        schedule: {
            day: string;
            time: string;
            endTime: string;
            activity: string;
            location: string;
        }[];
    }

    const [formData, setFormData] = useState<GroupFormData>({
        name: '',
        minAge: '5',
        maxAge: '14',
        coachId: '',
        maxStudents: '20',
        currentStatus: 'normal',
        schedule: []
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Excel Import Flow State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSavedListsModalOpen, setIsSavedListsModalOpen] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [overrideTargetGroup, setOverrideTargetGroup] = useState<Group | null>(null);
    const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState({
        nameCol: '',
        phoneCol: '',
        ageCol: '',
        groupCol: '',
        coachCol: ''
    });

    // Granting State
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedAchievementId, setSelectedAchievementId] = useState<string>('');
    const [grantReason, setGrantReason] = useState('');

    // Add Student State
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

    // Remove Student State
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [removeReason, setRemoveReason] = useState('');


    // Status Management State
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [statusData, setStatusData] = useState({
        status: 'normal' as 'normal' | 'cancelled' | 'substitute',
        message: '',
        substituteCoachId: ''
    });

    // --- Effects ---
    useEffect(() => {
        const unsubscribeGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
        });

        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        });

        const unsubscribeCoaches = onSnapshot(collection(db, "coaches"), (snapshot) => {
            setCoaches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeDefs = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            setDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition)));
        });

        // Registry Listener from pending_students
        const unsubscribeRegistry = onSnapshot(collection(db, "pending_students"), (snapshot) => {
            setRegistry(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Schedule Overrides Listener
        const unsubscribeOverrides = onSnapshot(collection(db, "schedule_overrides"), (snapshot) => {
            setOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        setLoading(false);

        return () => {
            unsubscribeGroups();
            unsubscribeUsers();
            unsubscribeCoaches();
            unsubscribeDefs();
            unsubscribeRegistry();
            unsubscribeOverrides();
        };
    }, []);

    // Outside click listener for dropdowns
    useEffect(() => {
        const handleDocClick = () => {
            setIsToolsMenuOpen(false);
            setActiveRowMenuId(null);
        };
        window.addEventListener('click', handleDocClick);
        return () => window.removeEventListener('click', handleDocClick);
    }, []);

    // --- Handlers ---

    const handleOpenStatusModal = (group: Group) => {
        setSelectedGroup(group);
        setStatusData({
            status: group.currentStatus || 'normal',
            message: group.statusMessage || '',
            substituteCoachId: group.substituteCoachId || ''
        });
        setIsStatusModalOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!selectedGroup) return;
        setProcessing(true);
        try {
            const groupRef = doc(db, "groups", selectedGroup.id);
            await updateDoc(groupRef, {
                currentStatus: statusData.status,
                statusMessage: statusData.message,
                substituteCoachId: statusData.substituteCoachId,
                updatedAt: serverTimestamp()
            });

            setSuccessMessage("Статус группы обновлен");
            setIsStatusModalOpen(false);
        } catch (error: any) {
            setErrorMessage("Ошибка обновления статуса: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 2000);
        }
    };

    const handleDeleteOverride = async (overrideId: string) => {
        if (!window.confirm('Вы уверены, что хотите отменить эту запись форс-мажора?')) return;
        try {
            setProcessing(true);
            await deleteDoc(doc(db, 'schedule_overrides', overrideId));
            setSuccessMessage('Запись форс-мажора успешно удалена');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setErrorMessage('Ошибка удаления форс-мажора: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleOpenEditor = (group?: Group, initialTab: 'settings' | 'students' = 'settings') => {
        setDrawerTab(initialTab);
        if (group) {
            const matchedCoach = 
                coaches.find(c => c.id === group.coachId) ||
                users.find(u => u.id === group.coachId) ||
                coaches.find(c => c.name?.trim().toLowerCase() === group.coachName?.trim().toLowerCase()) ||
                users.find(u => (u.displayName || u.name)?.trim().toLowerCase() === group.coachName?.trim().toLowerCase());

            setEditingId(group.id);
            setFormData({
                name: group.name || '',
                minAge: (group.ageRange?.min ?? 3).toString(),
                maxAge: (group.ageRange?.max ?? 18).toString(),
                coachId: matchedCoach?.id || group.coachId || '',
                maxStudents: (group.maxStudents ?? 20).toString(),
                currentStatus: group.currentStatus || 'normal',
                schedule: (group.schedule || []).map((s: any) => ({
                    day: s.day || 'Понедельник',
                    time: s.time || '18:00',
                    endTime: s.endTime || '',
                    activity: s.activity || 'Тренировка',
                    location: s.location || ''
                }))
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                minAge: '5',
                maxAge: '14',
                coachId: '',
                maxStudents: '20',
                currentStatus: 'normal',
                schedule: [
                    { day: 'Понедельник', time: '16:00', endTime: '17:30', activity: 'Тренировка', location: 'Главный зал' },
                    { day: 'Среда', time: '16:00', endTime: '17:30', activity: 'Тренировка', location: 'Главный зал' },
                    { day: 'Пятница', time: '16:00', endTime: '17:30', activity: 'Тренировка', location: 'Главный зал' }
                ]
            });
        }
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formData.name.trim()) {
            setErrorMessage("Пожалуйста, укажите название группы");
            return;
        }

        setProcessing(true);
        try {
            const coach = activeCoaches.find(c => c.id === formData.coachId) ||
                          coaches.find(c => c.id === formData.coachId) ||
                          users.find(u => u.id === formData.coachId);
            const coachName = coach?.name || coach?.displayName || (formData.coachId ? '' : 'Не назначен');
            const coachPhoto = getCoachPhoto(coach) || coach?.image || coach?.photoURL || '';

            const groupData: any = {
                name: formData.name.trim(),
                ageRange: {
                    min: parseInt(formData.minAge) || 0,
                    max: parseInt(formData.maxAge) || 18
                },
                coachId: formData.coachId || 'pending',
                coachName: coachName,
                coachImage: coachPhoto,
                maxStudents: parseInt(formData.maxStudents) || 20,
                currentStatus: formData.currentStatus || 'normal',
                schedule: formData.schedule.map(s => ({
                    day: s.day || 'Понедельник',
                    time: s.time || '18:00',
                    endTime: s.endTime || '',
                    activity: s.activity || 'Тренировка',
                    location: s.location || ''
                })),
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "groups", editingId), groupData);

                // --- Sync Group Chats in `chats` collection upon coach change ---
                if (formData.coachId) {
                    try {
                        const targetCoachUser = users.find(u => 
                            u.id === formData.coachId || 
                            (coachName && (u.displayName?.trim().toLowerCase() === coachName.toLowerCase() || u.name?.trim().toLowerCase() === coachName.toLowerCase()))
                        );
                        const newCoachUid = targetCoachUser ? targetCoachUser.id : formData.coachId;

                        const qChats = query(collection(db, 'chats'), where('groupId', '==', editingId));
                        const chatsSnap = await getDocs(qChats);
                        for (const cDoc of chatsSnap.docs) {
                            await updateDoc(doc(db, 'chats', cDoc.id), {
                                coachId: newCoachUid,
                                coachName: coachName,
                                participants: arrayUnion(newCoachUid),
                                updatedAt: serverTimestamp()
                            });
                        }
                    } catch (chatSyncErr) {
                        console.warn("Could not sync group chat on coach update:", chatSyncErr);
                    }
                }

                setSuccessMessage("✓ Группа и расписание успешно обновлены!");
            } else {
                await addDoc(collection(db, "groups"), {
                    ...groupData,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("✓ Группа успешно создана!");
            }

            // Keep general schedule in sync
            triggerScheduleSync().catch(console.error);

            setTimeout(() => {
                setIsEditorOpen(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (error: any) {
            setErrorMessage("Ошибка сохранения: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSyncOfficialSpartaSchedule = async () => {
        if (!window.confirm("Синхронизировать 7 официальных групп и расписание Спарта?\n\n- Будут созданы/обновлены группы для тренеров:\n  • Якупов П.В. (2016-2018 г.р. | Пн/Ср/Пт 19:00-20:00)\n  • Кубарь С.И. (2014-2015 г.р. | Пн/Ср/Пт 20:00-21:00)\n  • Пономарев С.А. (2012-2013 | Пн/Ср/Пт 20:00-21:00)\n  • Пономарев С.А. (2014-2015 | Пн/Ср/Пт 19:00-20:00)\n  • Пономарев С.А. (2016-2017 | Сб/Вс 13:00-14:00)\n  • Пономарев С.А. (2018-2020 | Сб/Вс 12:00-13:00)\n  • Пономарев С.А. (2012-2015 | Сб/Вс 14:00-15:00)\n- Все существующие ученики сохранятся.")) return;

        setProcessing(true);
        setErrorMessage(null);
        try {
            // 1. Ensure Coaches Exist
            const officialCoaches = [
                { name: "Пономарев Сергей Александрович", role: "Старший тренер по футболу", image: "/sergey-ponomarev.png", short: "Пономарев" },
                { name: "Кубарь Сергей Игоревич", role: "Тренер по футболу", image: "/sergey-kubar-gold.png", short: "Кубарь" },
                { name: "Якупов Павел Валерьевич", role: "Тренер по футболу", image: "/pavel-yakupov-gold.png", short: "Якупов" },
            ];

            const coachMap: Record<string, string> = {};

            for (const oc of officialCoaches) {
                const existingCoach = coaches.find(c =>
                    c.name?.toLowerCase().includes(oc.short.toLowerCase())
                );

                if (existingCoach) {
                    coachMap[oc.short] = existingCoach.id;
                } else {
                    const newCoachDoc = await addDoc(collection(db, "coaches"), {
                        name: oc.name,
                        role: oc.role,
                        image: oc.image,
                        order: 1,
                        createdAt: serverTimestamp()
                    });
                    coachMap[oc.short] = newCoachDoc.id;
                }
            }

            // 2. Official Groups & Schedules
            const officialGroups = [
                {
                    key: 'yakupov_2016_2018',
                    name: 'гр. Якупова 2016-2018',
                    ageRange: { min: 6, max: 8 },
                    coachKey: 'Якупов',
                    coachName: 'Якупов Павел Валерьевич',
                    maxStudents: 30,
                    schedule: [
                        { day: 'Понедельник', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Среда', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Пятница', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'kubar_2014_2015',
                    name: 'гр. Кубаря 2014-2015',
                    ageRange: { min: 9, max: 10 },
                    coachKey: 'Кубарь',
                    coachName: 'Кубарь Сергей Игоревич',
                    maxStudents: 20,
                    schedule: [
                        { day: 'Понедельник', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Среда', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Пятница', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'ponomarev_2012_2013_weekday',
                    name: 'гр. Пономарева 2012-2013 (Будни)',
                    ageRange: { min: 11, max: 12 },
                    coachKey: 'Пономарев',
                    coachName: 'Пономарев Сергей Александрович',
                    maxStudents: 20,
                    schedule: [
                        { day: 'Понедельник', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Среда', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Пятница', time: '20:00', endTime: '21:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'ponomarev_2014_2015_weekday',
                    name: 'гр. Пономарева 2014-2015 (Будни)',
                    ageRange: { min: 9, max: 10 },
                    coachKey: 'Пономарев',
                    coachName: 'Пономарев Сергей Александрович',
                    maxStudents: 20,
                    schedule: [
                        { day: 'Понедельник', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Среда', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Пятница', time: '19:00', endTime: '20:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'ponomarev_2016_2017_weekend',
                    name: 'гр. Пономарева 2016-2017 (Выходные)',
                    ageRange: { min: 7, max: 8 },
                    coachKey: 'Пономарев',
                    coachName: 'Пономарев Сергей Александрович',
                    maxStudents: 25,
                    schedule: [
                        { day: 'Суббота', time: '13:00', endTime: '14:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Воскресенье', time: '13:00', endTime: '14:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'ponomarev_2018_2020_weekend',
                    name: 'гр. Пономарева 2018-2020 (Выходные)',
                    ageRange: { min: 4, max: 6 },
                    coachKey: 'Пономарев',
                    coachName: 'Пономарев Сергей Александрович',
                    maxStudents: 20,
                    schedule: [
                        { day: 'Суббота', time: '12:00', endTime: '13:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Воскресенье', time: '12:00', endTime: '13:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                },
                {
                    key: 'ponomarev_2012_2015_weekend',
                    name: 'гр. Пономарева 2012-2015 (Выходные)',
                    ageRange: { min: 9, max: 12 },
                    coachKey: 'Пономарев',
                    coachName: 'Пономарев Сергей Александрович',
                    maxStudents: 20,
                    schedule: [
                        { day: 'Суббота', time: '14:00', endTime: '15:00', activity: 'Футбол', location: 'Главный зал' },
                        { day: 'Воскресенье', time: '14:00', endTime: '15:00', activity: 'Футбол', location: 'Главный зал' },
                    ]
                }
            ];

            const batch = writeBatch(db);

            for (const og of officialGroups) {
                const coachId = coachMap[og.coachKey] || 'pending';

                const existing = groups.find(g => {
                    const gName = g.name.toLowerCase();
                    if (og.coachKey === 'Якупов' && (gName.includes('якупов') || gName.includes('якупова'))) return true;
                    if (og.coachKey === 'Кубарь' && (gName.includes('кубарь') || gName.includes('кубаря'))) return true;
                    if (og.coachKey === 'Пономарев') {
                        if (og.key.includes('2012_2013') && gName.includes('2012') && gName.includes('2013') && !gName.includes('выходн')) return true;
                        if (og.key.includes('2014_2015') && gName.includes('2014') && gName.includes('2015') && !gName.includes('выходн')) return true;
                        if (og.key.includes('2016_2017') && gName.includes('2016') && gName.includes('2017')) return true;
                        if (og.key.includes('2018_2020') && (gName.includes('2018') || gName.includes('2019') || gName.includes('2020'))) return true;
                        if (og.key.includes('2012_2015_weekend') && gName.includes('выходн') && (gName.includes('2012') || gName.includes('2015'))) return true;
                    }
                    return false;
                });

                const groupData = {
                    name: og.name,
                    ageRange: og.ageRange,
                    coachId: coachId,
                    coachName: og.coachName,
                    maxStudents: og.maxStudents,
                    currentStatus: 'normal',
                    schedule: og.schedule,
                    updatedAt: serverTimestamp()
                };

                if (existing) {
                    const groupRef = doc(db, "groups", existing.id);
                    batch.update(groupRef, groupData);
                } else {
                    const newGroupRef = doc(collection(db, "groups"));
                    batch.set(newGroupRef, {
                        ...groupData,
                        createdAt: serverTimestamp()
                    });
                }
            }

            await batch.commit();

            // Synchronize General Schedule Timetable
            await triggerScheduleSync();

            setSuccessMessage("✓ 7 официальных групп и расписание Спарта успешно синхронизированы!");
            setTimeout(() => setSuccessMessage(null), 3500);
        } catch (error: any) {
            console.error("Official sync error:", error);
            setErrorMessage("Ошибка синхронизации расписания: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleConsolidateSpartaGroups = async () => {
        if (!window.confirm("Объединить группы и перенести всех учеников в 7 официальных групп Спарта?\n\n✓ Все ученики (133 чел.) будут бережно распределены по официальным группам тренеров (Якупов, Кубарь, Пономарев).\n✓ Абонементы, балансы, телефоны и прогресс сохранятся на 100%.\n✓ Устаревшие дубликаты групп будут удалены.")) return;

        setProcessing(true);
        setErrorMessage(null);
        try {
            const officialGroupKeywords = [
                { key: 'yakupov', match: 'Якупова 2016-2018' },
                { key: 'kubar', match: 'Кубаря 2014-2015' },
                { key: 'ponomarev_2012_2013_w', match: 'Пономарева 2012-2013 (Будни)' },
                { key: 'ponomarev_2014_2015_w', match: 'Пономарева 2014-2015 (Будни)' },
                { key: 'ponomarev_2016_2017_we', match: 'Пономарева 2016-2017 (Выходные)' },
                { key: 'ponomarev_2018_2020_we', match: 'Пономарева 2018-2020 (Выходные)' },
                { key: 'ponomarev_2012_2015_we', match: 'Пономарева 2012-2015 (Выходные)' },
            ];

            const currentGroupsSnapshot = await getDocs(collection(db, "groups"));
            const currentGroups = currentGroupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

            const findOfficialGroup = (name: string, age: number = 0) => {
                const n = name.toLowerCase();
                if (n.includes('якупов') || n.includes('якупова')) {
                    return currentGroups.find(g => g.name.includes('Якупова 2016-2018'));
                }
                if (n.includes('кубарь') || n.includes('кубаря')) {
                    return currentGroups.find(g => g.name.includes('Кубаря 2014-2015'));
                }
                if (n.includes('2018') || n.includes('2019') || n.includes('2020') || n.includes('малыши') || (age >= 4 && age <= 6)) {
                    return currentGroups.find(g => g.name.includes('2018-2020 (Выходные)')) || currentGroups.find(g => g.name.includes('2018'));
                }
                if (n.includes('2016') || n.includes('2017') || (age >= 7 && age <= 8)) {
                    return currentGroups.find(g => g.name.includes('2016-2017 (Выходные)')) || currentGroups.find(g => g.name.includes('Якупова'));
                }
                if (n.includes('2014') || n.includes('2015') || (age >= 9 && age <= 10)) {
                    return currentGroups.find(g => g.name.includes('2014-2015 (Будни)')) || currentGroups.find(g => g.name.includes('Кубаря'));
                }
                if (n.includes('2012') || n.includes('2013') || (age >= 11 && age <= 13)) {
                    return currentGroups.find(g => g.name.includes('2012-2013 (Будни)')) || currentGroups.find(g => g.name.includes('2012-2015'));
                }
                return currentGroups.find(g => g.name.includes('2014-2015 (Будни)')) || currentGroups[0];
            };

            let movedCount = 0;
            let currentBatch = writeBatch(db);
            let opCount = 0;

            const safeCommit = async () => {
                if (opCount > 0) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    opCount = 0;
                }
            };

            // 1. Scan and migrate pending students
            const pendingSnap = await getDocs(collection(db, "pending_students"));
            for (const docSnap of pendingSnap.docs) {
                const data = docSnap.data();
                const currentGrpId = data.groupId || data.targetGroupId;
                const currentGrp = currentGroups.find(g => g.id === currentGrpId);
                const isOfficial = currentGrp && officialGroupKeywords.some(ok => currentGrp.name.includes(ok.match));

                if (!isOfficial) {
                    const targetOfficialGroup = findOfficialGroup(currentGrp?.name || data.groupName || '', data.childAge || 0);
                    if (targetOfficialGroup) {
                        currentBatch.update(doc(db, "pending_students", docSnap.id), {
                            groupId: targetOfficialGroup.id,
                            groupName: targetOfficialGroup.name,
                            updatedAt: serverTimestamp()
                        });
                        opCount++;
                        movedCount++;
                        if (opCount >= 350) await safeCommit();
                    }
                }
            }

            // 2. Scan and migrate real users (preserving memberships, balance, badges 100%)
            const usersSnap = await getDocs(collection(db, "users"));
            for (const docSnap of usersSnap.docs) {
                const u = docSnap.data();
                if (['admin', 'director', 'developer', 'staff'].includes(u.role || '')) continue;
                const currentGrpId = u.groupId;
                const currentGrp = currentGroups.find(g => g.id === currentGrpId);
                const isOfficial = currentGrp && officialGroupKeywords.some(ok => currentGrp.name.includes(ok.match));

                if (!isOfficial && currentGrpId) {
                    const targetOfficialGroup = findOfficialGroup(currentGrp?.name || u.groupName || '', u.childAge || 0);
                    if (targetOfficialGroup) {
                        currentBatch.update(doc(db, "users", docSnap.id), {
                            groupId: targetOfficialGroup.id,
                            groupName: targetOfficialGroup.name,
                            updatedAt: serverTimestamp()
                        });
                        opCount++;
                        movedCount++;
                        if (opCount >= 350) await safeCommit();
                    }
                }
            }

            // 3. Clean up legacy duplicate groups
            for (const g of currentGroups) {
                const isOfficial = officialGroupKeywords.some(ok => g.name.includes(ok.match));
                if (!isOfficial) {
                    currentBatch.delete(doc(db, "groups", g.id));
                    opCount++;
                    if (opCount >= 350) await safeCommit();
                }
            }

            await safeCommit();
            await triggerScheduleSync();

            setSuccessMessage(`✓ Успешно объединено! Переведено учеников: ${movedCount}, группы приведены к 7 официальным.`);
            setTimeout(() => setSuccessMessage(null), 4500);
        } catch (error: any) {
            console.error("Consolidation error:", error);
            setErrorMessage("Ошибка объединения групп: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!editingId) return;
        if (!window.confirm("Удалить эту группу? \n\n⚠️ ВНИМАНИЕ: \n- Все ученики будут исключены из группы (статус 'Без группы').\n- Все ожидающие (импортированные) ученики этой группы будут удалены.")) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);

            // 1. Unlink Real Users
            const groupUsers = users.filter(u => u.groupId === editingId);
            groupUsers.forEach(u => {
                const userRef = doc(db, "users", u.id);
                batch.update(userRef, { groupId: null });
            });

            // 2. Delete Pending / Ghost Users
            const ghostUsers = registry.filter(r => String(r.groupId || r.targetGroupId).trim() === editingId);
            ghostUsers.forEach(r => {
                const regRef = doc(db, "pending_students", r.id);
                batch.delete(regRef);
            });

            // 3. Delete Group
            const groupRef = doc(db, "groups", editingId);
            batch.delete(groupRef);

            await batch.commit();

            // Keep general schedule in sync
            triggerScheduleSync().catch(console.error);

            setSuccessMessage("Группа успешно удалена");
            setIsEditorOpen(false);
            setEditingId(null);

        } catch (error: any) {
            console.error("Delete Error:", error);
            setErrorMessage("Ошибка удаления: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    // Bulk Selection State
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [isBulkCoachModalOpen, setIsBulkCoachModalOpen] = useState(false);
    const [bulkSelectedCoachId, setBulkSelectedCoachId] = useState<string>('');
    const [isBulkAssigning, setIsBulkAssigning] = useState(false);

    const handleToggleSelectGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleBulkAssignCoach = async () => {
        if (selectedGroupIds.length === 0 || !bulkSelectedCoachId) return;

        const targetCoach = activeCoaches.find(c => c.id === bulkSelectedCoachId) ||
                            coaches.find(c => c.id === bulkSelectedCoachId) ||
                            users.find(u => u.id === bulkSelectedCoachId);

        const coachName = targetCoach?.name || targetCoach?.displayName || 'Тренер';
        const coachPhoto = getCoachPhoto(targetCoach) || targetCoach?.image || targetCoach?.photoURL || '';

        setIsBulkAssigning(true);
        try {
            const batch = writeBatch(db);

            for (const groupId of selectedGroupIds) {
                const groupRef = doc(db, "groups", groupId);
                batch.update(groupRef, {
                    coachId: bulkSelectedCoachId,
                    coachName: coachName,
                    coachImage: coachPhoto,
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();

            // Synchronize group chats in `chats` collection
            const targetCoachUser = users.find(u => 
                u.id === bulkSelectedCoachId || 
                (coachName && ((u.displayName || u.name || '').trim().toLowerCase() === coachName.toLowerCase()))
            );
            const newCoachUid = targetCoachUser ? targetCoachUser.id : bulkSelectedCoachId;

            for (const groupId of selectedGroupIds) {
                try {
                    const qChats = query(collection(db, 'chats'), where('groupId', '==', groupId));
                    const chatsSnap = await getDocs(qChats);
                    for (const cDoc of chatsSnap.docs) {
                        await updateDoc(doc(db, 'chats', cDoc.id), {
                            coachId: newCoachUid,
                            coachName: coachName,
                            participants: arrayUnion(newCoachUid),
                            updatedAt: serverTimestamp()
                        });
                    }
                } catch (chatErr) {
                    console.warn("Could not sync chat for group", groupId, chatErr);
                }
            }

            // Sync website timetable
            await triggerScheduleSync().catch(console.error);

            setSuccessMessage(`✓ Тренер ${coachName} успешно назначен для ${selectedGroupIds.length} групп!`);
            setSelectedGroupIds([]);
            setIsBulkCoachModalOpen(false);
            setTimeout(() => setSuccessMessage(null), 3500);
        } catch (error: any) {
            console.error("Bulk Assign Coach Error:", error);
            setErrorMessage("Ошибка массового назначения: " + error.message);
        } finally {
            setIsBulkAssigning(false);
        }
    };

    // Express Coach-to-Coach Transfer Modal State
    const [isExpressTransferModalOpen, setIsExpressTransferModalOpen] = useState(false);
    const [expressFromCoachId, setExpressFromCoachId] = useState<string>('');
    const [expressToCoachId, setExpressToCoachId] = useState<string>('');
    const [isExpressTransferring, setIsExpressTransferring] = useState(false);

    // Filter transferable groups for express transfer
    const expressTransferableGroups = useMemo(() => {
        if (!expressFromCoachId) return [];
        const fromCoach = activeCoaches.find(c => c.id === expressFromCoachId) ||
                          coaches.find(c => c.id === expressFromCoachId) ||
                          users.find(u => u.id === expressFromCoachId);
        const fromName = (fromCoach?.name || fromCoach?.displayName || '').trim().toLowerCase();

        return groups.filter(g => 
            g.coachId === expressFromCoachId || 
            (fromName && (g.coachName || '').trim().toLowerCase() === fromName)
        );
    }, [groups, expressFromCoachId, activeCoaches, coaches, users]);

    const handleExpressTransfer = async () => {
        if (!expressFromCoachId || !expressToCoachId || expressTransferableGroups.length === 0) return;
        if (expressFromCoachId === expressToCoachId) {
            alert("Пожалуйста, выберите разных тренеров для передачи");
            return;
        }

        const targetCoach = activeCoaches.find(c => c.id === expressToCoachId) ||
                            coaches.find(c => c.id === expressToCoachId) ||
                            users.find(u => u.id === expressToCoachId);
        const coachName = targetCoach?.name || targetCoach?.displayName || 'Тренер';
        const coachPhoto = getCoachPhoto(targetCoach) || targetCoach?.image || targetCoach?.photoURL || '';

        setIsExpressTransferring(true);
        try {
            const batch = writeBatch(db);

            for (const g of expressTransferableGroups) {
                const groupRef = doc(db, "groups", g.id);
                batch.update(groupRef, {
                    coachId: expressToCoachId,
                    coachName: coachName,
                    coachImage: coachPhoto,
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();

            // Synchronize group chats in `chats` collection
            const targetCoachUser = users.find(u => 
                u.id === expressToCoachId || 
                (coachName && ((u.displayName || u.name || '').trim().toLowerCase() === coachName.toLowerCase()))
            );
            const newCoachUid = targetCoachUser ? targetCoachUser.id : expressToCoachId;

            for (const g of expressTransferableGroups) {
                try {
                    const qChats = query(collection(db, 'chats'), where('groupId', '==', g.id));
                    const chatsSnap = await getDocs(qChats);
                    for (const cDoc of chatsSnap.docs) {
                        await updateDoc(doc(db, 'chats', cDoc.id), {
                            coachId: newCoachUid,
                            coachName: coachName,
                            participants: arrayUnion(newCoachUid),
                            updatedAt: serverTimestamp()
                        });
                    }
                } catch (chatErr) {
                    console.warn("Could not sync chat for group", g.id, chatErr);
                }
            }

            // Sync schedule
            await triggerScheduleSync().catch(console.error);

            setSuccessMessage(`✓ Все ${expressTransferableGroups.length} составов успешно переданы тренеру ${coachName}!`);
            setIsExpressTransferModalOpen(false);
            setTimeout(() => setSuccessMessage(null), 3500);
        } catch (error: any) {
            console.error("Express Transfer Error:", error);
            setErrorMessage("Ошибка при передаче составов: " + error.message);
        } finally {
            setIsExpressTransferring(false);
        }
    };

    const handleBulkDeleteGroups = async () => {
        if (selectedGroupIds.length === 0) return;
        if (!window.confirm(`Удалить выбранные группы (${selectedGroupIds.length})? \n\n⚠️ ВНИМАНИЕ: \n- Все ученики в этих группах станут "Без группы".\n- Все импортированные (незарегистрированные) ученики будут удалены.`)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let deletedGroups = 0;

            for (const groupId of selectedGroupIds) {
                // 1. Unlink Real Users
                const groupUsers = users.filter(u => u.groupId === groupId);
                groupUsers.forEach(u => {
                    const userRef = doc(db, "users", u.id);
                    batch.update(userRef, { groupId: null });
                });

                // 2. Delete Ghost Users
                const ghostUsers = registry.filter(r => String(r.groupId || r.targetGroupId).trim() === groupId);
                ghostUsers.forEach(r => {
                    const regRef = doc(db, "pending_students", r.id);
                    batch.delete(regRef);
                });

                // 3. Delete Group
                const groupRef = doc(db, "groups", groupId);
                batch.delete(groupRef);
                deletedGroups++;
            }

            await batch.commit();

            setSuccessMessage(`Успешно удалено групп: ${deletedGroups}`);
            setSelectedGroupIds([]);
        } catch (error: any) {
            console.error("Bulk Delete Error:", error);
            setErrorMessage("Ошибка массового удаления: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    // --- Automatic & Manual Synchronization ---
    const handleSyncDatabase = async () => {
        setProcessing(true);
        try {
            const pendingSnap = await getDocs(collection(db, "pending_students"));
            const usersSnap = await getDocs(collection(db, "users"));

            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            const allPending = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            let linkedCount = 0;
            let batch = writeBatch(db);
            let opCount = 0;

            const safeBatchCommit = async () => {
                if (opCount > 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            };

            for (const pending of allPending) {
                if (pending.status === 'linked' && pending.assignedUid) continue;

                const pendingPhone = (pending.parentPhone || '').replace(/\D/g, '');
                const pendingName = (pending.childFullName || pending.childName || '').trim().toLowerCase();

                const matchedUser = allUsers.find(u => {
                    const uPhone = (u.parentPhone || u.phone || '').replace(/\D/g, '');
                    const uName = (u.childName || u.displayName || `${u.childFirstName || ''} ${u.childLastName || ''}`).trim().toLowerCase();

                    const isPhoneMatch = pendingPhone.length >= 10 && uPhone.length >= 10 && (pendingPhone.endsWith(uPhone.slice(-10)) || uPhone.endsWith(pendingPhone.slice(-10)));
                    const isNameMatch = Boolean(pendingName && uName && pendingName === uName);

                    return isPhoneMatch || isNameMatch;
                });

                if (matchedUser) {
                    const targetGroupId = pending.groupId || pending.targetGroupId;
                    const updateUserData: any = {};
                    if (targetGroupId && (!matchedUser.groupId || matchedUser.groupId === 'none')) {
                        updateUserData.groupId = targetGroupId;
                        const targetGrp = groups.find(g => g.id === targetGroupId);
                        if (targetGrp) updateUserData.groupName = targetGrp.name;
                    }
                    if (!matchedUser.childName && pending.childFullName) {
                        updateUserData.childName = pending.childFullName;
                    }
                    if ((!matchedUser.childAge || matchedUser.childAge === 0) && pending.childAge) {
                        updateUserData.childAge = pending.childAge;
                    }

                    if (Object.keys(updateUserData).length > 0) {
                        updateUserData.updatedAt = serverTimestamp();
                        batch.update(doc(db, "users", matchedUser.id), updateUserData);
                        opCount++;
                    }

                    batch.update(doc(db, "pending_students", pending.id), {
                        status: 'linked',
                        linkedUserId: matchedUser.id,
                        assignedUid: matchedUser.id,
                        linkedAt: serverTimestamp()
                    });
                    opCount++;
                    linkedCount++;

                    if (opCount >= 350) {
                        await safeBatchCommit();
                    }
                }
            }

            await safeBatchCommit();

            setSuccessMessage(`Синхронизация завершена! Привязано учеников: ${linkedCount}`);
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            console.error("Sync error:", err);
            setErrorMessage("Ошибка синхронизации: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // --- Logic: Auto-distribute ---
    const handleAutoDistribute = async () => {
        if (!window.confirm("Это действие распределит детей БЕЗ группы по подходящим возрастным группам. Продолжить?")) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let updateCount = 0;

            users.forEach(user => {
                if (!user.groupId && user.childAge) {
                    // Find matching group
                    const group = groups.find(g =>
                        user.childAge >= g.ageRange.min &&
                        user.childAge <= g.ageRange.max
                    );
                    if (group) {
                        const userRef = doc(db, "users", user.id);
                        batch.update(userRef, { groupId: group.id });
                        updateCount++;
                    }
                }
            });

            if (updateCount > 0) {
                await batch.commit();
                setSuccessMessage(`Распределено детей: ${updateCount}`);
            } else {
                setSuccessMessage("Нет детей для распределения");
            }
        } catch (error: any) {
            setErrorMessage("Ошибка распределения: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    // --- Logic: Smart Excel Import ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                if (!jsonData || jsonData.length === 0) {
                    setErrorMessage("Файл пуст или имеет неверный формат.");
                    return;
                }

                const cols = Object.keys(jsonData[0] || {});
                setExcelColumns(cols);
                setRawExcelRows(jsonData);

                const nameC = cols.find(c => /фио|ребенок|имя|ученик|name|child/i.test(c)) || cols[0] || '';
                const phoneC = cols.find(c => /телефон|телефон родителя|phone|tel|mobile/i.test(c)) || '';
                const ageC = cols.find(c => /возраст|age|лет|г\.?р/i.test(c)) || '';
                const groupC = cols.find(c => /группа|group|секция/i.test(c)) || '';
                const coachC = cols.find(c => /тренер|coach/i.test(c)) || '';

                setColumnMapping({
                    nameCol: nameC,
                    phoneCol: phoneC,
                    ageCol: ageC,
                    groupCol: groupC,
                    coachCol: coachC
                });

                setIsImportModalOpen(true);
            } catch (error: any) {
                console.error("Excel Error:", error);
                setErrorMessage("Ошибка чтения файла: " + error.message);
            } finally {
                setProcessing(false);
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const exportGroupToExcel = (group: Group) => {
        const coach = coaches.find(c => c.id === group.coachId);
        const coachName = coach?.name || (group as any).coachName || 'Не назначен';

        const groupUsers = users.filter(u => u.groupId === group.id);
        const pendingStudents = registry.filter(r =>
            (String(r.groupId || r.targetGroupId).trim() === group.id) &&
            r.status !== 'linked' &&
            (!r.assignedUid || r.assignedUid === '')
        );

        const exportRows: any[] = [];

        groupUsers.forEach((u, idx) => {
            const uChildName = u.childName || (u as any).displayName || (u as any).name || 'Ученик';
            const uParentName = u.parentName || (u as any).parentFullName || '';
            const uPhone = u.parentPhone || (u as any).phone || '';
            const uAge = u.childAge || calculateAge((u as any).childBirthDate || '') || '';
            exportRows.push({
                '№': idx + 1,
                'ФИО Ученика': uChildName,
                'Телефон Родителя': uPhone,
                'Возраст': uAge,
                'Родитель': uParentName,
                'Группа': group.name,
                'Тренер': coachName,
                'Статус': '🟢 В базе (активен)'
            });
        });

        pendingStudents.forEach((p, idx) => {
            exportRows.push({
                '№': groupUsers.length + idx + 1,
                'ФИО Ученика': p.childFullName || `${p.childLastName || ''} ${p.childFirstName || ''}`.trim() || p.childName || '',
                'Телефон Родителя': p.parentPhone || '',
                'Возраст': p.childAge || '',
                'Родитель': p.parentName || '',
                'Группа': group.name,
                'Тренер': coachName,
                'Статус': '⏳ Ожидает активации'
            });
        });

        if (exportRows.length === 0) {
            exportRows.push({
                '№': 1,
                'ФИО Ученика': 'Пример ученика',
                'Телефон Родителя': '+7 (999) 000-00-00',
                'Возраст': '8',
                'Родитель': 'Иванова Мария',
                'Группа': group.name,
                'Тренер': coachName,
                'Статус': 'Шаблон'
            });
        }

        const ws = XLSX.utils.json_to_sheet(exportRows);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 32 },
            { wch: 22 },
            { wch: 12 },
            { wch: 28 },
            { wch: 25 },
            { wch: 22 },
            { wch: 24 }
        ];

        const wb = XLSX.utils.book_new();
        const cleanSheetName = group.name.replace(/[*?:/\\\[\]]/g, '').slice(0, 30) || 'Группа';
        XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
        const safeFileName = `${group.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_')}_список.xlsx`;
        XLSX.writeFile(wb, safeFileName);
    };

    const handleConfirmImport = async (rowsToImport: ImportRow[], mergeStrategy: MergeStrategy = 'smart_upsert') => {
        if (!rowsToImport.length) return;

        setProcessing(true);
        setSuccessMessage("Выполнение импорта...");

        try {
            let currentBatch = writeBatch(db);
            let batchOpCount = 0;

            const safeBatchSet = async (ref: any, data: any) => {
                currentBatch.set(ref, data);
                batchOpCount++;
                if (batchOpCount >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchOpCount = 0;
                }
            };

            const safeBatchUpdate = async (ref: any, data: any) => {
                currentBatch.update(ref, data);
                batchOpCount++;
                if (batchOpCount >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchOpCount = 0;
                }
            };

            const safeBatchDelete = async (ref: any) => {
                currentBatch.delete(ref);
                batchOpCount++;
                if (batchOpCount >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchOpCount = 0;
                }
            };

            let newGroupsCount = 0;
            let studentsProcessed = 0;

            const groupsMap: Record<string, { coach: string; students: any[]; ages: number[] }> = {};
            const normalize = (s: any) => s ? String(s).trim() : '';
            const currentYear = new Date().getFullYear();

            for (const row of rowsToImport) {
                const childName = normalize(row.childName);
                if (!childName) continue;

                const groupName = normalize(row.groupName) || 'Без группы';
                const ageRaw = normalize(row.age);
                let ageNum = parseInt(ageRaw.replace(/\D/g, '') || '0', 10);
                if (ageNum >= 1990 && ageNum <= currentYear + 1) {
                    ageNum = Math.max(3, currentYear - ageNum);
                }

                const phone = normalize(row.phone);
                const coachName = normalize(row.coachName);

                if (!groupsMap[groupName]) {
                    groupsMap[groupName] = { coach: coachName, students: [], ages: [] };
                }

                groupsMap[groupName].students.push({ childName, age: ageNum || ageRaw, phone, coachName, raw: row });
                if (ageNum > 0 && ageNum < 100) {
                    groupsMap[groupName].ages.push(ageNum);
                }
            }

            const existingGroupsSnapshot = await getDocs(collection(db, "groups"));
            const existingGroups = existingGroupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));
            const groupNameIdMap: Record<string, string> = {};

            for (const [name, data] of Object.entries(groupsMap)) {
                if (name === 'Без группы') continue;

                const minAge = data.ages.length ? Math.min(...data.ages) : 5;
                const maxAge = data.ages.length ? Math.max(...data.ages) : 18;

                let groupId = existingGroups.find(g => g.name.toLowerCase() === name.toLowerCase())?.id;

                if (!groupId) {
                    const newGroupRef = doc(collection(db, "groups"));
                    groupId = newGroupRef.id;

                    await safeBatchSet(newGroupRef, {
                        name: name,
                        ageRange: { min: minAge, max: maxAge },
                        coachId: 'pending',
                        coachName: data.coach,
                        schedule: [],
                        createdAt: serverTimestamp(),
                        currentStatus: 'normal'
                    });
                    newGroupsCount++;
                }
                groupNameIdMap[name] = groupId;
            }

            // If replace_group mode: clear previous members from all affected target groups
            if (mergeStrategy === 'replace_group') {
                for (const [groupName, _] of Object.entries(groupsMap)) {
                    const targetGroupId = groupNameIdMap[groupName];
                    if (!targetGroupId) continue;

                    // Unassign users
                    const usersInGroup = users.filter(u => u.groupId === targetGroupId);
                    for (const u of usersInGroup) {
                        await safeBatchUpdate(doc(db, "users", u.id), { groupId: '' });
                    }

                    // Delete pending students in this group
                    const pendingSnap = await getDocs(query(collection(db, "pending_students"), where("groupId", "==", targetGroupId)));
                    for (const d of pendingSnap.docs) {
                        await safeBatchDelete(d.ref);
                    }
                }
            }

            for (const [groupName, data] of Object.entries(groupsMap)) {
                const targetGroupId = groupNameIdMap[groupName];

                for (const student of data.students) {
                    const cleanPhone = student.phone ? student.phone.replace(/\D/g, '') : '';
                    const childFullName = (student.childName || '').trim();
                    const nameParts = childFullName.split(/\s+/);
                    const childFirstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
                    const childLastName = nameParts.length > 1 ? nameParts[0] : '';

                    const rawParentName = (
                        student.parentName ||
                        student.raw?.['Родитель'] || student.raw?.['Родители'] || student.raw?.['ФИО родителя'] ||
                        student.raw?.['ФИО Родителя'] || student.raw?.['ФИО Представителя'] || student.raw?.['Представитель'] ||
                        student.raw?.['Законный представитель'] || student.raw?.['Мама/Папа'] || student.raw?.parentName || ''
                    ).trim();

                    const existingUser = users.find(u =>
                        (u.childName && u.childName.toLowerCase() === student.childName.toLowerCase()) ||
                        (cleanPhone && (u.parentPhone || (u as any).phone || '').replace(/\D/g, '').includes(cleanPhone.slice(-10)))
                    );

                    const pendingSnap = await getDocs(
                        query(collection(db, "pending_students"), where("childFullName", "==", childFullName))
                    );

                    let existingPendingDoc = pendingSnap.docs.find(d => {
                        const data = d.data();
                        const pPhone = (data.parentPhone || '').replace(/\D/g, '');
                        return (cleanPhone && pPhone.includes(cleanPhone.slice(-10))) || (targetGroupId && data.groupId === targetGroupId);
                    });

                    // Check insert_only strategy
                    if (mergeStrategy === 'insert_only' && (existingUser || existingPendingDoc)) {
                        continue; // skip existing
                    }

                    if (existingUser) {
                        if (targetGroupId && existingUser.groupId !== targetGroupId) {
                            await safeBatchUpdate(doc(db, "users", existingUser.id), {
                                groupId: targetGroupId,
                                groupName: groupName,
                                updatedAt: serverTimestamp()
                            });
                        }
                    } else if (existingPendingDoc) {
                        await safeBatchUpdate(doc(db, "pending_students", existingPendingDoc.id), {
                            parentPhone: cleanPhone || existingPendingDoc.data().parentPhone || '',
                            parentName: rawParentName || existingPendingDoc.data().parentName || '',
                            childFirstName,
                            childLastName,
                            childAge: student.age || existingPendingDoc.data().childAge || 0,
                            groupId: targetGroupId || existingPendingDoc.data().groupId || '',
                            groupName: groupName || existingPendingDoc.data().groupName || '',
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        const pendingRef = doc(collection(db, "pending_students"));
                        await safeBatchSet(pendingRef, {
                            parentPhone: cleanPhone,
                            parentEmail: (student.raw?.parentEmail || student.raw?.email || '').trim().toLowerCase(),
                            parentName: rawParentName,
                            childFirstName,
                            childLastName,
                            childFullName,
                            childAge: student.age || 0,
                            groupId: targetGroupId || '',
                            groupName: groupName || '',
                            status: 'pending',
                            createdAt: serverTimestamp()
                        });
                    }
                    studentsProcessed++;
                }
            }

            if (batchOpCount > 0) {
                await currentBatch.commit();
            }

            setSuccessMessage(`✓ Импорт успешно выполнен (${mergeStrategy === 'replace_group' ? 'Замена состава' : mergeStrategy === 'insert_only' ? 'Только новые' : 'Умное обновление'})! Создано групп: ${newGroupsCount}, Обработано: ${studentsProcessed}`);
            setIsImportModalOpen(false);
            setRawExcelRows([]);
        } catch (error: any) {
            console.error("Import Error:", error);
            setErrorMessage("Ошибка импорта: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 4000);
        }
    };



    // --- Logic: Granting ---
    const handleOpenGrantModal = (studentId: string) => {
        setSelectedStudentId(studentId);
        setSelectedAchievementId('');
        setGrantReason('');
        setIsGrantModalOpen(true);
    };

    const handleGrantAchievement = async () => {
        if (!selectedStudentId || !selectedAchievementId) return;

        setProcessing(true);
        try {
            const achievementDef = definitions.find(d => d.id === selectedAchievementId);
            if (!achievementDef) throw new Error("Achievement not found");

            const newAchievement: UserAchievement = {
                id: Date.now().toString(), // Simple ID generation
                definitionId: achievementDef.id,
                date: new Date().toISOString(),
                reason: grantReason,
                grantedBy: 'admin',
                isNew: true // Flag for badge
            };

            const batch = writeBatch(db);
            const userRef = doc(db, "users", selectedStudentId);

            // 1. Add Achievement
            batch.update(userRef, {
                achievements: arrayUnion(newAchievement)
            });

            // 2. Create Notification
            const student = users.find(u => u.id === selectedStudentId);

            if (student?.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: selectedStudentId,
                    email: student.email,
                    title: "Новая награда! 🏆",
                    message: `Вам выдана награда "${achievementDef.title}". Поздравляем!`,
                    isRead: false,
                    type: 'achievement',
                    link: '/dashboard?tab=achievements', // Deep link to achievements tab
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();

            setSuccessMessage(`Награда "${achievementDef.title}" выдана!`);
            setTimeout(() => {
                setIsGrantModalOpen(false);
                setSuccessMessage(null);
                setSelectedStudentId(null);
                setSelectedAchievementId('');
                setGrantReason('');
            }, 1000);
        } catch (error: any) {
            console.error("Grant Error:", error);
            setErrorMessage("Ошибка выдачи: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddStudentToGroup = async (userId: string) => {
        if (!editingId) return;
        setProcessing(true);
        try {
            await updateDoc(doc(db, "users", userId), { groupId: editingId });
            setSuccessMessage("Ученик добавлен в группу");
            setIsAddStudentModalOpen(false);
            setStudentSearchQuery('');
        } catch (error: any) {
            setErrorMessage("Ошибка добавления: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 2000);
        }
    };

    const handleRemoveUsers = async () => {
        if (selectedUserIds.length === 0) return;
        setProcessing(true);

        try {
            const batch = writeBatch(db);
            const currentGroup = groups.find(g => g.id === editingId);
            let removedCount = 0;

            selectedUserIds.forEach(userId => {
                const userObj = users.find(u => u.id === userId);

                if (userObj) {
                    // It's a Real User -> Remove from group
                    const userRef = doc(db, "users", userId);
                    batch.update(userRef, { groupId: null });

                    // Optional: Send Notification
                    if (removeReason.trim() && userObj.email) {
                        const notifRef = doc(collection(db, "notifications"));
                        batch.set(notifRef, {
                            userId: userId,
                            email: userObj.email,
                            title: "Исключение из группы",
                            message: `Вы были исключены из группы ${currentGroup?.name || 'Unknown'}. Причина: ${removeReason}`,
                            isRead: false,
                            type: 'alert',
                            createdAt: serverTimestamp()
                        });
                    }
                    removedCount++;
                } else {
                    // It's a Pending Student -> Delete from pending_students
                    const regRef = doc(db, "pending_students", userId);
                    batch.delete(regRef);
                    // Also delete from legacy student_registry if exists
                    const legacyRegRef = doc(db, "student_registry", userId);
                    batch.delete(legacyRegRef);
                    removedCount++;
                }
            });

            await batch.commit();

            setSuccessMessage(`Исключено учеников: ${removedCount}`);
            setIsRemoveModalOpen(false);
            setRemoveReason('');
            setSelectedUserIds([]);
        } catch (error: any) {
            console.error("Remove Error:", error);
            setErrorMessage("Ошибка исключения: " + error.message);
        } finally {
            setProcessing(false);
        }
    };


    const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

    const updateSchedule = (index: number, field: string, value: string) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData({ ...formData, schedule: newSchedule });
    };

    const addScheduleItem = () => {
        setFormData({
            ...formData,
            schedule: [
                ...formData.schedule,
                {
                    day: 'Понедельник',
                    time: '18:00',
                    endTime: '19:30',
                    activity: formData.name || 'Тренировка',
                    location: 'Главный зал'
                }
            ]
        });
    };

    const removeScheduleItem = (index: number) => {
        const newSchedule = formData.schedule.filter((_, i) => i !== index);
        setFormData({ ...formData, schedule: newSchedule });
    };

    const applySchedulePreset = (presetType: 'sparta_mwf_19' | 'sparta_mwf_20' | 'sparta_we_12' | 'sparta_we_13' | 'sparta_we_14' | 'mon_wed_fri' | 'tue_thu_sat' | 'weekend' | 'everyday') => {
        const groupActivity = formData.name || 'Футбол';
        let newItems: any[] = [];
        if (presetType === 'sparta_mwf_19') {
            newItems = [
                { day: 'Понедельник', time: '19:00', endTime: '20:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Среда', time: '19:00', endTime: '20:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Пятница', time: '19:00', endTime: '20:00', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'sparta_mwf_20') {
            newItems = [
                { day: 'Понедельник', time: '20:00', endTime: '21:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Среда', time: '20:00', endTime: '21:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Пятница', time: '20:00', endTime: '21:00', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'sparta_we_12') {
            newItems = [
                { day: 'Суббота', time: '12:00', endTime: '13:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Воскресенье', time: '12:00', endTime: '13:00', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'sparta_we_13') {
            newItems = [
                { day: 'Суббота', time: '13:00', endTime: '14:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Воскресенье', time: '13:00', endTime: '14:00', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'sparta_we_14') {
            newItems = [
                { day: 'Суббота', time: '14:00', endTime: '15:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Воскресенье', time: '14:00', endTime: '15:00', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'mon_wed_fri') {
            newItems = [
                { day: 'Понедельник', time: '16:00', endTime: '17:30', activity: groupActivity, location: 'Главный зал' },
                { day: 'Среда', time: '16:00', endTime: '17:30', activity: groupActivity, location: 'Главный зал' },
                { day: 'Пятница', time: '16:00', endTime: '17:30', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'tue_thu_sat') {
            newItems = [
                { day: 'Вторник', time: '17:30', endTime: '19:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Четверг', time: '17:30', endTime: '19:00', activity: groupActivity, location: 'Главный зал' },
                { day: 'Суббота', time: '11:00', endTime: '12:30', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'weekend') {
            newItems = [
                { day: 'Суббота', time: '10:00', endTime: '11:30', activity: groupActivity, location: 'Главный зал' },
                { day: 'Воскресенье', time: '10:00', endTime: '11:30', activity: groupActivity, location: 'Главный зал' }
            ];
        } else if (presetType === 'everyday') {
            newItems = daysOfWeek.slice(0, 5).map(day => ({
                day,
                time: '18:00',
                endTime: '19:30',
                activity: groupActivity,
                location: 'Главный зал'
            }));
        }
        setFormData(prev => ({ ...prev, schedule: newItems }));
    };

    const filteredGroups = groups.filter(group => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const coach = coaches.find(c => c.id === group.coachId);
            const coachName = coach?.name?.toLowerCase() || '';
            const groupName = group.name?.toLowerCase() || '';
            const ageStr = `${group.ageRange?.min || ''}-${group.ageRange?.max || ''}`;
            const matches = groupName.includes(q) || coachName.includes(q) || ageStr.includes(q);
            if (!matches) return false;
        }

        if (groupFilterTab === 'WITH_PENDING') {
            const pendingCount = registry.filter(r =>
                (String(r.groupId || r.targetGroupId).trim() === group.id) &&
                r.status !== 'linked' &&
                (!r.assignedUid || r.assignedUid === '')
            ).length;
            if (pendingCount === 0) return false;
        }

        if (groupFilterTab === 'NO_COACH') {
            const hasCoach = group.coachId && group.coachId !== 'pending' && group.coachId !== '';
            if (hasCoach) return false;
        }

        if (groupFilterTab === 'HAS_FREE') {
            const groupUsers = users.filter(u => u.groupId === group.id);
            const isFull = groupUsers.length >= (group.maxStudents || 20);
            if (isFull) return false;
        }

        return true;
    });

    const totalActiveAthletes = users.filter(u => u.groupId && u.groupId !== '' && u.groupId !== 'none').length;
    const totalPendingRegistry = registry.filter(r => r.status !== 'linked' && (!r.assignedUid || r.assignedUid === '')).length;
    const totalUnassignedUsers = users.filter(u => !u.groupId || u.groupId === '' || u.groupId === 'none').length;

    if (loading) return <div className="text-white text-center p-10 font-russo text-lg">Загрузка групп...</div>;

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                {/* Header */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-russo text-white">Группы и Расписание</h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/30 text-xs font-bold font-mono">
                                    {groups.length} групп
                                </span>
                            </div>
                            <p className="text-white/40 text-xs mt-1">
                                Управление составами ({totalActiveAthletes + totalPendingRegistry} учеников), недельным расписанием и оперативными отменами
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Selected Groups Actions */}
                            {selectedGroupIds.length > 0 && (
                                <div className="flex items-center gap-2 animate-in fade-in">
                                    <button
                                        onClick={() => setSelectedGroupIds([])}
                                        className="text-white/50 hover:text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        Сбросить ({selectedGroupIds.length})
                                    </button>
                                    <button
                                        onClick={handleBulkDeleteGroups}
                                        disabled={processing || isBulkAssigning}
                                        className="bg-red-500/90 hover:bg-red-600 text-white font-bold py-2 px-3.5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                                    >
                                        {processing ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        Удалить ({selectedGroupIds.length})
                                    </button>
                                </div>
                            )}

                            {/* Secondary Tools Dropdown */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                                    className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-semibold py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs shadow-sm"
                                    title="Дополнительные служебные действия"
                                >
                                    <Settings size={14} className="text-sparta-gold" />
                                    <span>Инструменты</span>
                                    {totalPendingRegistry > 0 && (
                                        <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                                            {totalPendingRegistry}
                                        </span>
                                    )}
                                    <ChevronDown size={13} className={`text-white/40 transition-transform duration-200 ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isToolsMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#141417] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-white/5 text-left">
                                        <div className="py-1 space-y-1">
                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    handleSyncOfficialSpartaSchedule();
                                                }}
                                                disabled={processing}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <Zap size={16} className="text-sparta-gold shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">Расписание Спарта</div>
                                                    <div className="text-[10px] text-white/40">Синхронизировать официальные группы</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    handleSyncDatabase();
                                                }}
                                                disabled={processing}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-purple-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <RefreshCw size={15} className={`text-purple-400 shrink-0 ${processing ? 'animate-spin' : ''}`} />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white flex items-center gap-1.5">
                                                        <span>Синхронизация базы</span>
                                                        {totalPendingRegistry > 0 && (
                                                            <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 rounded-full font-mono">
                                                                {totalPendingRegistry}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-white/40">Обновить связи с реестром учеников</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    setIsImportModalOpen(true);
                                                }}
                                                disabled={processing}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <Upload size={15} className="text-emerald-400 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">Импорт из Excel</div>
                                                    <div className="text-[10px] text-white/40">Загрузить таблицу учеников и групп</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    setIsSavedListsModalOpen(true);
                                                }}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <FolderOpen size={15} className="text-sparta-gold shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">Списки и файлы</div>
                                                    <div className="text-[10px] text-white/40">Сохраненные выгрузки и документы</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    setPublishMessengerTargetGroup(null);
                                                    setIsPublishMessengerModalOpen(true);
                                                }}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <MessageSquare size={15} className="text-sparta-gold shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">Опубликовать в Мессенджер</div>
                                                    <div className="text-[10px] text-white/40">Разослать расписание в чаты Спарта</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsToolsMenuOpen(false);
                                                    handleAutoDistribute();
                                                }}
                                                disabled={processing}
                                                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-3 cursor-pointer"
                                            >
                                                <Users size={15} className="text-white/60 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">Авто-распределение</div>
                                                    <div className="text-[10px] text-white/40">Распределить свободных по возрастам</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Always Visible Transfer Groups Button */}
                            <button
                                onClick={() => {
                                    if (selectedGroupIds.length > 0) {
                                        setBulkSelectedCoachId(activeCoaches[0]?.id || '');
                                        setIsBulkCoachModalOpen(true);
                                    } else {
                                        if (activeCoaches.length > 0) {
                                            setExpressFromCoachId(activeCoaches[0].id);
                                            setExpressToCoachId(activeCoaches[1]?.id || activeCoaches[0].id);
                                        }
                                        setIsExpressTransferModalOpen(true);
                                    }
                                }}
                                disabled={processing || isBulkAssigning || isExpressTransferring}
                                className={`font-bold py-2 px-3.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm font-russo ${
                                    selectedGroupIds.length > 0
                                        ? 'bg-gradient-to-r from-sparta-gold to-amber-500 hover:brightness-110 text-black border-transparent shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                                        : 'bg-white/10 hover:bg-white/20 text-white hover:text-sparta-gold border-white/15 hover:border-sparta-gold/40'
                                }`}
                                title={selectedGroupIds.length > 0 ? `Передать выбранные (${selectedGroupIds.length}) группы новому тренеру` : "Массовая передача составов от одного тренера другому"}
                            >
                                <ArrowRightLeft size={13} className={selectedGroupIds.length > 0 ? "text-black" : "text-sparta-gold"} />
                                <span>🔄 Передать группы {selectedGroupIds.length > 0 ? `(${selectedGroupIds.length})` : ''}</span>
                            </button>

                            {/* Primary Action Button */}
                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold hover:bg-[#ffd700] text-black font-bold py-2 px-4 rounded-xl shadow-lg shadow-sparta-gold/20 hover:shadow-sparta-gold/40 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-russo"
                            >
                                <Plus size={15} className="text-black stroke-[3]" />
                                <span>+ Создать группу</span>
                            </button>
                        </div>
                    </div>

                    {/* Mode Switcher Tabs (Segmented Control) */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-1 w-fit">
                        <button
                            onClick={() => setMainTab('GROUPS')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                mainTab === 'GROUPS'
                                    ? 'bg-sparta-gold text-black shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Users size={14} />
                            <span>Группы ({groups.length})</span>
                        </button>
                        <button
                            onClick={() => setMainTab('SCHEDULE')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                mainTab === 'SCHEDULE'
                                    ? 'bg-sparta-gold text-black shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Calendar size={14} />
                            <span>Календарь недели</span>
                        </button>
                        <button
                            onClick={() => setMainTab('OVERRIDES')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                mainTab === 'OVERRIDES'
                                    ? 'bg-sparta-gold text-black shadow-md'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ShieldAlert size={14} />
                            <span>Форс-мажоры</span>
                            {overrides.length > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                    mainTab === 'OVERRIDES' ? 'bg-black text-sparta-gold' : 'bg-amber-500/30 text-amber-300'
                                }`}>
                                    {overrides.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Toolbar: Search, Filter Tabs, and View Switcher (Only in GROUPS mode) */}
                    {mainTab === 'GROUPS' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        {/* Search & Category Tabs */}
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                            <div className="relative min-w-[220px] max-w-[320px] w-full bg-[#111] border border-white/10 focus-within:border-sparta-gold/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                                <Search size={14} className="text-white/30 shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Поиск группы, тренера, возраста..."
                                    className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none font-medium"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white text-xs cursor-pointer">✕</button>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'ALL', label: 'Все', count: groups.length },
                                    {
                                        id: 'WITH_PENDING',
                                        label: '⏳ Ожидают входа',
                                        count: groups.filter(g => registry.some(r => (String(r.groupId || r.targetGroupId).trim() === g.id) && r.status !== 'linked' && (!r.assignedUid || r.assignedUid === ''))).length
                                    },
                                    {
                                        id: 'HAS_FREE',
                                        label: '🟢 Есть места',
                                        count: groups.filter(g => users.filter(u => u.groupId === g.id).length < (g.maxStudents || 20)).length
                                    },
                                    {
                                        id: 'NO_COACH',
                                        label: '⚠️ Без тренера',
                                        count: groups.filter(g => !g.coachId || g.coachId === 'pending' || g.coachId === '').length
                                    }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setGroupFilterTab(tab.id as any)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                            groupFilterTab === tab.id
                                                ? 'bg-white/15 text-white border border-white/20 font-bold shadow-sm'
                                                : 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/5'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${groupFilterTab === tab.id ? 'bg-sparta-gold text-black font-bold' : 'bg-white/10 text-white/40'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View Switcher: Table vs Cards */}
                        <div className="flex items-center bg-[#111] p-1 rounded-xl border border-white/10 shrink-0">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-sparta-gold text-black font-bold shadow-sm'
                                        : 'text-white/40 hover:text-white'
                                }`}
                                title="Режим таблицы (компактный список)"
                            >
                                <List size={14} />
                                <span>Таблица</span>
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-sparta-gold text-black font-bold shadow-sm'
                                        : 'text-white/40 hover:text-white'
                                }`}
                                title="Режим карточек"
                            >
                                <LayoutGrid size={14} />
                                <span>Карточки</span>
                            </button>
                        </div>
                    </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    {successMessage && !isGrantModalOpen && (
                        <div className="mb-6 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-4">
                            <Check size={16} />
                            {successMessage}
                        </div>
                    )}

                    {mainTab === 'GROUPS' && (
                    filteredGroups.length === 0 ? (
                        <div className="text-center py-16 bg-[#0F0F0F] border border-white/5 rounded-2xl p-8 max-w-lg mx-auto">
                            <Users size={36} className="mx-auto text-white/20 mb-3" />
                            <h3 className="text-base font-bold text-white mb-1">Группы не найдены</h3>
                            <p className="text-white/40 text-xs mb-4">
                                {searchQuery ? 'По вашему запросу ничего не найдено.' : 'В выбранном фильтре пока нет групп.'}
                            </p>
                            {(searchQuery || groupFilterTab !== 'ALL') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setGroupFilterTab('ALL'); }}
                                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Сбросить фильтры
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'table' ? (
                        /* === 1. TABLE VIEW (Compact, Intuitive & Fast) === */
                        <div className="bg-[#0e0e10] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[760px]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40 font-bold">
                                            <th className="py-3 px-4 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredGroups.length > 0 && selectedGroupIds.length === filteredGroups.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGroupIds(filteredGroups.map(g => g.id));
                                                        } else {
                                                            setSelectedGroupIds([]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/50 cursor-pointer"
                                                />
                                            </th>
                                            <th className="py-3 px-4">Группа</th>
                                            <th className="py-3 px-4">Возраст</th>
                                            <th className="py-3 px-4">Тренер</th>
                                            <th className="py-3 px-4">Заполняемость</th>
                                            <th className="py-3 px-4">Расписание</th>
                                            <th className="py-3 px-4">Статус</th>
                                            <th className="py-3 px-4 text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs">
                                        {filteredGroups.map(group => {
                                            const groupUsers = users.filter(u => u.groupId === group.id);
                                            const pendingStudents = registry.filter(r =>
                                                (String(r.groupId || r.targetGroupId).trim() === group.id) &&
                                                r.status !== 'linked' &&
                                                (!r.assignedUid || r.assignedUid === '')
                                            );
                                            const totalStudents = groupUsers.length + pendingStudents.length;
                                            const maxCap = group.maxStudents || 20;
                                            const matchedCoach = 
                                                coaches.find(c => c.id === group.coachId) ||
                                                users.find(u => u.id === group.coachId) ||
                                                coaches.find(c => c.name?.trim().toLowerCase() === group.coachName?.trim().toLowerCase()) ||
                                                users.find(u => (u.displayName || u.name)?.trim().toLowerCase() === group.coachName?.trim().toLowerCase());

                                            const coachName = 
                                                matchedCoach?.name || 
                                                matchedCoach?.displayName || 
                                                group.coachName || 
                                                "Не назначен";

                                            const coachPhoto = 
                                                getCoachPhoto(matchedCoach) || 
                                                matchedCoach?.image || 
                                                matchedCoach?.photoURL || 
                                                group.coachImage || 
                                                null;
                                            const isSelected = selectedGroupIds.includes(group.id);
                                            const isEditing = editingId === group.id;

                                            return (
                                                <tr
                                                    key={group.id}
                                                    onClick={() => handleOpenEditor(group, 'settings')}
                                                    className={`group transition-colors cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/10'
                                                            : isEditing
                                                            ? 'bg-white/10'
                                                            : 'hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => handleToggleSelectGroup(group.id, e as any)}
                                                            className="w-4 h-4 rounded border-white/20 bg-black/50 cursor-pointer"
                                                        />
                                                    </td>

                                                    {/* Group Name */}
                                                    <td className="py-3 px-4">
                                                        <p className="text-white font-bold group-hover:text-sparta-gold transition-colors font-russo text-sm">
                                                            {group.name}
                                                        </p>
                                                    </td>

                                                    {/* Age */}
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-[11px]">
                                                            {group.ageRange?.min || 0}–{group.ageRange?.max || 18} лет
                                                        </span>
                                                    </td>

                                                    {/* Coach */}
                                                    <td className="py-3 px-4" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedGroupIds([group.id]);
                                                        setBulkSelectedCoachId(group.coachId || activeCoaches[0]?.id || '');
                                                        setIsBulkCoachModalOpen(true);
                                                    }}>
                                                        <div 
                                                            className="flex items-center gap-2 hover:bg-white/5 cursor-pointer rounded-lg px-2 py-1.5 transition-all group/coach border border-transparent hover:border-white/10 -ml-2 w-fit"
                                                            title="Нажмите, чтобы сменить наставника для этой группы"
                                                        >
                                                            {coachPhoto ? (
                                                                <img
                                                                    src={coachPhoto}
                                                                    alt={coachName}
                                                                    className="w-6 h-6 rounded-full object-cover border border-amber-500/30 shrink-0 group-hover/coach:border-sparta-gold transition-colors"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-bold shrink-0 group-hover/coach:text-sparta-gold transition-colors">
                                                                    {coachName !== 'Не назначен' ? coachName[0] : '?'}
                                                                </div>
                                                            )}
                                                            <div className="overflow-hidden flex items-center gap-1.5">
                                                                <p className="text-white text-xs font-semibold truncate max-w-[130px] group-hover/coach:text-sparta-gold transition-colors">{coachName}</p>
                                                                <RefreshCw className="w-3 h-3 text-amber-400/50 group-hover/coach:text-amber-400 shrink-0 transition-all" />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Capacity */}
                                                    <td className="py-3 px-4">
                                                        <div className="w-32 space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-white font-bold font-mono">
                                                                    {groupUsers.length} <span className="text-white/30 font-normal font-sans">/ {maxCap}</span>
                                                                </span>
                                                                {pendingStudents.length > 0 && (
                                                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold" title="Ожидают подтверждения входа">
                                                                        +{pendingStudents.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${
                                                                        groupUsers.length >= maxCap
                                                                            ? 'bg-red-500'
                                                                            : groupUsers.length >= maxCap * 0.8
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-sparta-gold'
                                                                    }`}
                                                                    style={{ width: `${Math.min(100, Math.round((groupUsers.length / maxCap) * 100))}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Schedule */}
                                                    <td className="py-3 px-4">
                                                        {group.schedule && group.schedule.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                                {group.schedule.slice(0, 2).map((s, idx) => (
                                                                    <span key={idx} className="text-[10px] font-medium bg-white/5 border border-white/10 text-white/70 px-1.5 py-0.5 rounded">
                                                                        {s.day?.slice(0, 2)} {s.time}
                                                                    </span>
                                                                ))}
                                                                {group.schedule.length > 2 && (
                                                                    <span className="text-[10px] text-white/30 self-center">
                                                                        +{group.schedule.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-white/20 text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                setOverrideTargetGroup(group);
                                                                setIsOverrideModalOpen(true);
                                                            }}
                                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 hover:scale-105 cursor-pointer ${
                                                                group.currentStatus === 'cancelled'
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                                                    : group.currentStatus === 'substitute'
                                                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                                                                    : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                                                            }`}
                                                            title="⚡ Нажмите для оперативной отмены, переноса или смены статуса"
                                                        >
                                                            {group.currentStatus === 'cancelled' ? (
                                                                <><AlertTriangle size={11} /> Отмена</>
                                                            ) : group.currentStatus === 'substitute' ? (
                                                                <><RefreshCw size={11} /> Замена</>
                                                            ) : (
                                                                <><Check size={11} /> Активна</>
                                                            )}
                                                        </button>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenEditor(group, 'students')}
                                                                className="px-3 py-1.5 bg-sparta-gold/15 hover:bg-sparta-gold text-sparta-gold hover:text-black border border-sparta-gold/30 hover:border-sparta-gold text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                                                                title="Открыть состав учеников"
                                                            >
                                                                <Users size={13} />
                                                                <span>Состав ({totalStudents})</span>
                                                            </button>

                                                            {/* Row Actions Dropdown */}
                                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => setActiveRowMenuId(activeRowMenuId === group.id ? null : group.id)}
                                                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer"
                                                                    title="Дополнительные действия"
                                                                >
                                                                    <MoreHorizontal size={15} />
                                                                </button>

                                                                {activeRowMenuId === group.id && (
                                                                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#16161a] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left divide-y divide-white/5">
                                                                        <div className="py-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowMenuId(null);
                                                                                    handleOpenEditor(group, 'settings');
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Settings size={13} className="text-white/40" />
                                                                                <span>Настройки и график</span>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowMenuId(null);
                                                                                    setSelectedGroupIds([group.id]);
                                                                                    setBulkSelectedCoachId(group.coachId || activeCoaches[0]?.id || '');
                                                                                    setIsBulkCoachModalOpen(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-sparta-gold hover:bg-sparta-gold/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer font-semibold"
                                                                            >
                                                                                <UserCheck size={13} className="text-sparta-gold" />
                                                                                <span>👔 Сменить наставника</span>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowMenuId(null);
                                                                                    setOverrideTargetGroup(group);
                                                                                    setIsOverrideModalOpen(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-amber-500/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <ShieldAlert size={13} className="text-amber-400" />
                                                                                <span>⚡ Форс-мажор / Отмена</span>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowMenuId(null);
                                                                                    setPublishMessengerTargetGroup(group);
                                                                                    setIsPublishMessengerModalOpen(true);
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <MessageSquare size={13} className="text-sparta-gold" />
                                                                                <span>Отправить в чат группы</span>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveRowMenuId(null);
                                                                                    exportGroupToExcel(group);
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Download size={13} className="text-white/40" />
                                                                                <span>Экспорт в Excel</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* === 2. GRID VIEW (Clean Cards) === */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredGroups.map(group => {
                                const groupUsers = users.filter(u => u.groupId === group.id);
                                const pendingStudents = registry.filter(r =>
                                    (String(r.groupId || r.targetGroupId).trim() === group.id) &&
                                    r.status !== 'linked' &&
                                    (!r.assignedUid || r.assignedUid === '')
                                );
                                const totalStudents = groupUsers.length + pendingStudents.length;
                                const maxCap = group.maxStudents || 20;
                                const matchedCoach = 
                                    coaches.find(c => c.id === group.coachId) ||
                                    users.find(u => u.id === group.coachId) ||
                                    coaches.find(c => c.name?.trim().toLowerCase() === group.coachName?.trim().toLowerCase()) ||
                                    users.find(u => (u.displayName || u.name)?.trim().toLowerCase() === group.coachName?.trim().toLowerCase());

                                const coachName = 
                                    matchedCoach?.name || 
                                    matchedCoach?.displayName || 
                                    group.coachName || 
                                    "Не назначен";

                                const coachPhoto = 
                                    getCoachPhoto(matchedCoach) || 
                                    matchedCoach?.image || 
                                    matchedCoach?.photoURL || 
                                    group.coachImage || 
                                    null;
                                const isSelected = selectedGroupIds.includes(group.id);

                                return (
                                    <div
                                        key={group.id}
                                        onClick={() => handleOpenEditor(group, 'settings')}
                                        className={`group bg-[#0e0e10] hover:bg-[#141416] border rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? 'border-sparta-gold bg-[#141416] shadow-lg'
                                                : editingId === group.id
                                                ? 'border-sparta-gold/50'
                                                : 'border-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        {/* Top Bar: Title & Age */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div
                                                    onClick={(e) => handleToggleSelectGroup(group.id, e as any)}
                                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sparta-gold border-sparta-gold text-black'
                                                            : 'border-white/20 hover:border-white/40'
                                                    }`}
                                                >
                                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className="text-base font-bold text-white group-hover:text-sparta-gold transition-colors font-russo truncate">
                                                        {group.name}
                                                    </h3>
                                                    <span className="text-[11px] text-white/40 font-semibold">
                                                        {group.ageRange?.min || 0}–{group.ageRange?.max || 18} лет
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOverrideTargetGroup(group);
                                                    setIsOverrideModalOpen(true);
                                                }}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all shrink-0 ${
                                                    group.currentStatus === 'cancelled'
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                        : group.currentStatus === 'substitute'
                                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                                        : 'bg-green-500/10 text-green-400 border-green-500/30'
                                                }`}
                                                title="⚡ Нажмите для оперативной отмены, переноса или смены статуса"
                                            >
                                                {group.currentStatus === 'cancelled' ? 'Отмена' : group.currentStatus === 'substitute' ? 'Замена' : 'Активна'}
                                            </button>
                                        </div>

                                        {/* Capacity Bar */}
                                        <div className="space-y-1 mb-3">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-white/60">Ученики ({totalStudents})</span>
                                                <span className="text-white font-mono">
                                                    <span className="text-sparta-gold font-bold">{groupUsers.length}</span>
                                                    {pendingStudents.length > 0 && <span className="text-purple-400 text-[11px]"> +{pendingStudents.length} ⏳</span>}
                                                    <span className="text-white/40"> / {maxCap}</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        groupUsers.length >= maxCap
                                                            ? 'bg-red-500'
                                                            : groupUsers.length >= maxCap * 0.8
                                                            ? 'bg-yellow-500'
                                                            : 'bg-sparta-gold'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.round((groupUsers.length / maxCap) * 100))}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Coach & Action footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedGroupIds([group.id]);
                                                    setBulkSelectedCoachId(group.coachId || activeCoaches[0]?.id || '');
                                                    setIsBulkCoachModalOpen(true);
                                                }}
                                                className="flex items-center gap-2 hover:bg-white/5 cursor-pointer rounded-lg px-2 py-1 transition-all group/coach border border-transparent hover:border-white/10 -ml-2"
                                                title="Нажмите, чтобы сменить наставника"
                                            >
                                                {coachPhoto ? (
                                                    <img src={coachPhoto} alt={coachName} className="w-6 h-6 rounded-full object-cover border border-amber-500/30 group-hover/coach:border-sparta-gold transition-colors" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-bold group-hover/coach:text-sparta-gold transition-colors">
                                                        {coachName !== 'Не назначен' ? coachName[0] : '?'}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-white text-xs font-semibold truncate max-w-[110px] group-hover/coach:text-sparta-gold transition-colors">{coachName}</p>
                                                    <RefreshCw className="w-3 h-3 text-amber-400/50 group-hover/coach:text-amber-400 shrink-0 transition-all" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditor(group, 'students'); }}
                                                    className="px-2.5 py-1.5 bg-sparta-gold/15 hover:bg-sparta-gold text-sparta-gold hover:text-black border border-sparta-gold/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Users size={12} />
                                                    <span>Состав ({totalStudents})</span>
                                                </button>

                                                {/* Card Actions Dropdown */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRowMenuId(activeRowMenuId === group.id ? null : group.id);
                                                        }}
                                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer"
                                                        title="Действия"
                                                    >
                                                        <MoreHorizontal size={14} />
                                                    </button>

                                                    {activeRowMenuId === group.id && (
                                                        <div
                                                            className="absolute right-0 bottom-full mb-1.5 w-48 bg-[#16161a] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left divide-y divide-white/5"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <div className="py-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRowMenuId(null);
                                                                        handleOpenEditor(group, 'settings');
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <Settings size={13} className="text-white/40" />
                                                                    <span>Настройки</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRowMenuId(null);
                                                                        setSelectedGroupIds([group.id]);
                                                                        setBulkSelectedCoachId(group.coachId || activeCoaches[0]?.id || '');
                                                                        setIsBulkCoachModalOpen(true);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs font-medium text-sparta-gold hover:bg-sparta-gold/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer font-semibold"
                                                                >
                                                                    <UserCheck size={13} className="text-sparta-gold" />
                                                                    <span>👔 Сменить наставника</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRowMenuId(null);
                                                                        setOverrideTargetGroup(group);
                                                                        setIsOverrideModalOpen(true);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-amber-500/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <ShieldAlert size={13} className="text-amber-400" />
                                                                    <span>Форс-мажор</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRowMenuId(null);
                                                                        setPublishMessengerTargetGroup(group);
                                                                        setIsPublishMessengerModalOpen(true);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-sparta-gold hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <MessageSquare size={13} className="text-sparta-gold" />
                                                                    <span>В чат группы</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveRowMenuId(null);
                                                                        exportGroupToExcel(group);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-xs font-medium text-white/80 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <Download size={13} className="text-white/40" />
                                                                    <span>Скачать Excel</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* === 2. WEEKLY SCHEDULE CALENDAR VIEW === */}
                    {mainTab === 'SCHEDULE' && (() => {
                        const todayDayIndex = new Date().getDay();
                        const uniqueLocations = Array.from(
                            new Set(groups.flatMap(g => (g.schedule || []).map(s => s.location).filter(Boolean)))
                        ) as string[];

                        const daysOfWeek = [
                            { name: 'Понедельник', short: 'ПН', dayIndex: 1, aliases: ['пн', 'понедельник', 'mon', 'monday'] },
                            { name: 'Вторник', short: 'ВТ', dayIndex: 2, aliases: ['вт', 'вторник', 'tue', 'tuesday'] },
                            { name: 'Среда', short: 'СР', dayIndex: 3, aliases: ['ср', 'среда', 'wed', 'wednesday'] },
                            { name: 'Четверг', short: 'ЧТ', dayIndex: 4, aliases: ['чт', 'четверг', 'thu', 'thursday'] },
                            { name: 'Пятница', short: 'ПТ', dayIndex: 5, aliases: ['пт', 'пятница', 'fri', 'friday'] },
                            { name: 'Суббота', short: 'СБ', dayIndex: 6, aliases: ['сб', 'суббота', 'sat', 'saturday'] },
                            { name: 'Воскресенье', short: 'ВС', dayIndex: 0, aliases: ['вс', 'воскресенье', 'sun', 'sunday'] },
                        ];

                        // Calculate total filtered trainings
                        let totalFilteredSlots = 0;
                        const dayColumnsData = daysOfWeek.map(dayObj => {
                            const slots: Array<{
                                group: Group;
                                time: string;
                                endTime?: string;
                                location?: string;
                                coach?: any;
                                coachName: string;
                                coachPhoto?: string;
                                studentCount: number;
                                maxCap: number;
                                override?: any;
                            }> = [];

                            groups.forEach(g => {
                                // Filter by coach if selected
                                if (scheduleCoachFilter !== 'ALL' && g.coachId !== scheduleCoachFilter) return;

                                const matchedCoach = 
                                    coaches.find(c => c.id === g.coachId) ||
                                    users.find(u => u.id === g.coachId) ||
                                    coaches.find(c => c.name?.trim().toLowerCase() === g.coachName?.trim().toLowerCase()) ||
                                    users.find(u => (u.displayName || u.name)?.trim().toLowerCase() === g.coachName?.trim().toLowerCase());

                                const coachName = matchedCoach?.name || matchedCoach?.displayName || (g as any).coachName || 'Тренер не назначен';
                                const coachPhoto = getCoachPhoto(matchedCoach) || matchedCoach?.image || (g as any).coachImage || '';
                                const groupUsers = users.filter(u => u.groupId === g.id);
                                const maxCap = g.maxStudents || 20;
                                const groupSched = g.schedule || [];

                                groupSched.forEach(s => {
                                    // Filter by location if selected
                                    if (scheduleLocationFilter !== 'ALL' && s.location !== scheduleLocationFilter) return;

                                    const slotDay = (s.day || '').toLowerCase().trim();
                                    if (dayObj.aliases.some(a => slotDay.includes(a))) {
                                        const matchedOverride = overrides.find(o => o.groupId === g.id || o.groupName === g.name);
                                        slots.push({
                                            group: g,
                                            time: s.time || '18:00',
                                            endTime: s.endTime || '',
                                            location: s.location || 'Главный манеж',
                                            coach: matchedCoach,
                                            coachName,
                                            coachPhoto,
                                            studentCount: groupUsers.length,
                                            maxCap,
                                            override: matchedOverride,
                                        });
                                    }
                                });
                            });

                            slots.sort((a, b) => a.time.localeCompare(b.time));
                            totalFilteredSlots += slots.length;

                            return {
                                ...dayObj,
                                isToday: dayObj.dayIndex === todayDayIndex,
                                slots,
                            };
                        });

                        return (
                            <div className="space-y-5 animate-in fade-in duration-200">
                                {/* Schedule Control Bar */}
                                <div className="bg-[#121216] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/15 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shadow-md">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-white font-russo text-base">Расписание тренировок</h2>
                                                <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                                                    {totalFilteredSlots} занятий / нед.
                                                </span>
                                            </div>
                                            <p className="text-white/40 text-xs mt-0.5">
                                                Кликните на любое занятие для редактирования состава или графика
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quick Filters & Actions */}
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Coach Filter */}
                                        <select
                                            value={scheduleCoachFilter}
                                            onChange={e => setScheduleCoachFilter(e.target.value)}
                                            className="bg-black/60 border border-white/15 hover:border-white/30 rounded-xl px-3 py-2 text-xs text-white/90 focus:border-sparta-gold focus:ring-1 focus:ring-sparta-gold outline-none transition-all cursor-pointer font-medium"
                                        >
                                            <option value="ALL">Все тренеры ({activeCoaches.length})</option>
                                            {activeCoaches.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>

                                        {/* Location Filter */}
                                        {uniqueLocations.length > 0 && (
                                            <select
                                                value={scheduleLocationFilter}
                                                onChange={e => setScheduleLocationFilter(e.target.value)}
                                                className="bg-black/60 border border-white/15 hover:border-white/30 rounded-xl px-3 py-2 text-xs text-white/90 focus:border-sparta-gold focus:ring-1 focus:ring-sparta-gold outline-none transition-all cursor-pointer font-medium"
                                            >
                                                <option value="ALL">Все залы ({uniqueLocations.length})</option>
                                                {uniqueLocations.map(loc => (
                                                    <option key={loc} value={loc}>{loc}</option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Reset filters if any active */}
                                        {(scheduleCoachFilter !== 'ALL' || scheduleLocationFilter !== 'ALL') && (
                                            <button
                                                onClick={() => {
                                                    setScheduleCoachFilter('ALL');
                                                    setScheduleLocationFilter('ALL');
                                                }}
                                                className="text-xs text-sparta-gold hover:underline font-semibold px-2 py-1 cursor-pointer"
                                            >
                                                Сбросить
                                            </button>
                                        )}

                                        {/* Publish to Messenger Button */}
                                        <button
                                            onClick={() => {
                                                setPublishMessengerTargetGroup(null);
                                                setIsPublishMessengerModalOpen(true);
                                            }}
                                            className="bg-sparta-gold/15 hover:bg-sparta-gold/25 text-sparta-gold border border-sparta-gold/40 hover:border-sparta-gold font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
                                            title="Опубликовать актуальное расписание в Мессенджер Спарта"
                                        >
                                            <MessageSquare size={14} className="text-sparta-gold" />
                                            <span>📢 В Мессенджер</span>
                                        </button>

                                        {/* Force Majeure Quick Button */}
                                        <button
                                            onClick={() => {
                                                setOverrideTargetGroup(null);
                                                setIsOverrideModalOpen(true);
                                            }}
                                            className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
                                        >
                                            <ShieldAlert size={14} className="text-amber-400" />
                                            <span>⚡ Форс-мажор</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 7-Days Columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                                    {dayColumnsData.map(day => (
                                        <div
                                            key={day.name}
                                            className={`rounded-2xl p-3 flex flex-col min-h-[460px] transition-all ${
                                                day.isToday
                                                    ? 'bg-[#14141a] border-2 border-sparta-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.08)]'
                                                    : 'bg-[#0d0d10] border border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {/* Day Header */}
                                            <div className={`pb-2.5 mb-2.5 border-b flex items-center justify-between ${
                                                day.isToday ? 'border-sparta-gold/30' : 'border-white/10'
                                            }`}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-mono font-extrabold uppercase ${
                                                        day.isToday ? 'text-sparta-gold' : 'text-white/60'
                                                    }`}>
                                                        {day.short}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">
                                                        {day.name}
                                                    </span>
                                                </div>

                                                {day.isToday ? (
                                                    <span className="bg-sparta-gold text-black font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide shadow-sm">
                                                        Сегодня
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-mono font-semibold text-white/40">
                                                        {day.slots.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Day Slots */}
                                            <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
                                                {day.slots.length === 0 ? (
                                                    <div
                                                        onClick={() => handleOpenEditor()}
                                                        className="h-44 border-2 border-dashed border-white/5 hover:border-sparta-gold/40 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-all group/empty cursor-pointer"
                                                        title="Нажмите, чтобы создать группу с тренировкой в этот день"
                                                    >
                                                        <span className="text-white/20 text-xs font-medium group-hover/empty:text-white/50 transition-colors">
                                                            Выходной
                                                        </span>
                                                        <span className="text-[10px] text-sparta-gold/60 group-hover/empty:text-sparta-gold font-bold mt-1.5 transition-colors flex items-center gap-1">
                                                            <Plus size={12} /> Добавить
                                                        </span>
                                                    </div>
                                                ) : (
                                                    day.slots.map((slot, idx) => {
                                                        const isCancelled = slot.override?.status === 'cancelled' || slot.group.currentStatus === 'cancelled';
                                                        const isSubstitute = slot.override?.status === 'replacement' || slot.group.currentStatus === 'substitute';

                                                        return (
                                                            <div
                                                                key={`${slot.group.id}-${idx}`}
                                                                onClick={() => handleOpenEditor(slot.group, 'settings')}
                                                                className={`p-3 rounded-xl border text-xs transition-all relative group/card cursor-pointer ${
                                                                    isCancelled
                                                                        ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/60 opacity-75'
                                                                        : isSubstitute
                                                                        ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-500/70 shadow-sm'
                                                                        : 'bg-[#151518] hover:bg-[#1a1a1f] border-white/10 hover:border-sparta-gold/50 shadow-md hover:shadow-lg'
                                                                }`}
                                                            >
                                                                {/* Time & Status / Fast Action */}
                                                                <div className="flex items-center justify-between gap-1 mb-2">
                                                                    <div className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs flex items-center gap-1 ${
                                                                        isCancelled
                                                                            ? 'bg-red-500/20 text-red-300 line-through'
                                                                            : isSubstitute
                                                                            ? 'bg-amber-500/25 text-amber-200'
                                                                            : 'bg-white/10 text-sparta-gold'
                                                                    }`}>
                                                                        <Clock size={11} />
                                                                        <span>{slot.time}{slot.endTime ? `–${slot.endTime}` : ''}</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1">
                                                                        {isCancelled && (
                                                                            <span className="px-1.5 py-0.2 bg-red-500/30 text-red-200 border border-red-500/50 rounded text-[9px] font-extrabold uppercase">
                                                                                Отмена
                                                                            </span>
                                                                        )}
                                                                        {isSubstitute && (
                                                                            <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded text-[9px] font-extrabold uppercase">
                                                                                Замена
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOverrideTargetGroup(slot.group);
                                                                                setIsOverrideModalOpen(true);
                                                                            }}
                                                                            className="p-1 hover:bg-amber-500/20 text-white/30 hover:text-amber-300 rounded-md transition-all cursor-pointer"
                                                                            title="⚡ Форс-мажор: отмена или замена"
                                                                        >
                                                                            <ShieldAlert size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Group Name & Age */}
                                                                <h4 className="font-russo text-white text-sm leading-tight group-hover/card:text-sparta-gold transition-colors truncate">
                                                                    {slot.group.name}
                                                                </h4>

                                                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/50">
                                                                    <span>{slot.group.ageRange?.min || 0}–{slot.group.ageRange?.max || 18} лет</span>
                                                                    <span>•</span>
                                                                    <span className="text-white/70 font-mono font-medium">{slot.studentCount}/{slot.maxCap} уч.</span>
                                                                </div>

                                                                {/* Coach & Location */}
                                                                <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1 text-[11px] text-white/60">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        {slot.coachPhoto ? (
                                                                            <img src={slot.coachPhoto} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                                                        ) : (
                                                                            <Users size={11} className="text-white/30 shrink-0" />
                                                                        )}
                                                                        <span className="truncate text-white/80 font-medium">{slot.coachName}</span>
                                                                    </div>
                                                                    {slot.location && (
                                                                        <div className="flex items-center gap-1 truncate text-white/40">
                                                                            <MapPin size={10} className="shrink-0 text-white/30" />
                                                                            <span className="truncate">{slot.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* === 3. FORCE MAJEURE & OVERRIDES LIST VIEW === */}
                    {mainTab === 'OVERRIDES' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="bg-gradient-to-r from-[#141418] to-[#0d0d10] border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-russo text-lg">Журнал форс-мажоров и замен</h2>
                                        <p className="text-white/40 text-xs font-manrope mt-0.5">
                                            Все зафиксированные разовые отмены, переносы времени и замены тренеров с авто-уведомлениями
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setOverrideTargetGroup(null);
                                        setIsOverrideModalOpen(true);
                                    }}
                                    className="bg-amber-500 text-black font-bold py-2.5 px-4 rounded-xl hover:bg-amber-400 transition-all flex items-center gap-2 cursor-pointer text-xs shadow-lg shadow-amber-500/20"
                                >
                                    <Plus size={15} />
                                    <span>+ Зафиксировать форс-мажор</span>
                                </button>
                            </div>

                            {overrides.length === 0 ? (
                                <div className="text-center py-16 bg-[#0e0e12] border border-white/10 rounded-2xl p-8 max-w-lg mx-auto">
                                    <ShieldAlert size={40} className="mx-auto text-emerald-400/40 mb-3" />
                                    <h3 className="text-base font-bold text-white mb-1">Форс-мажоров нет</h3>
                                    <p className="text-white/40 text-xs mb-4">
                                        Все тренировки клуба проходят в штатном режиме без замен и отмен.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-[#0e0e10] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                                    <table className="w-full text-left border-collapse min-w-[760px]">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/40 font-bold">
                                                <th className="py-3.5 px-4">Дата</th>
                                                <th className="py-3.5 px-4">Группа</th>
                                                <th className="py-3.5 px-4">Тип изменения</th>
                                                <th className="py-3.5 px-4">Причина</th>
                                                <th className="py-3.5 px-4">Продление абонемента</th>
                                                <th className="py-3.5 px-4 text-right">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-xs font-manrope">
                                            {overrides.map((item) => (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3 px-4 font-mono font-bold text-white/90">
                                                        {item.date || 'Сегодня'}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-white">
                                                        {item.groupName || item.groupId || 'Группа'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.status === 'cancelled' ? (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                                                                <AlertTriangle size={11} /> Отмена тренировки
                                                            </span>
                                                        ) : item.status === 'replacement' ? (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                                                <RefreshCw size={11} /> Замена ({item.replacementCoach || 'Тренер'})
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                                                                <Clock size={11} /> Перенос ({item.newTime || ''})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-white/70">
                                                        {item.reason || '—'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.extendSubscription ? (
                                                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                                <Check size={13} /> +1 день всем ученикам
                                                            </span>
                                                        ) : (
                                                            <span className="text-white/30">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => handleDeleteOverride(item.id)}
                                                            disabled={processing}
                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl transition-all cursor-pointer text-xs"
                                                            title="Отменить этот форс-мажор"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Interactive Excel Import Modal */}
                <ExcelImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    rawRows={rawExcelRows}
                    columns={excelColumns}
                    existingGroups={groups}
                    existingPhones={[...users.map(u => u.parentPhone || (u as any).phone || ''), ...registry.map(r => r.parentPhone || '')]}
                    existingUsers={users}
                    existingRegistry={registry}
                    onConfirmImport={handleConfirmImport}
                    processing={processing}
                    onFileLoaded={(rows, cols) => {
                        setRawExcelRows(rows);
                        setExcelColumns(cols);
                    }}
                />

                {/* Saved Lists & Files Modal */}
                <SavedListsModal
                    isOpen={isSavedListsModalOpen}
                    onClose={() => setIsSavedListsModalOpen(false)}
                    existingGroups={groups}
                    existingUsers={users}
                    onSyncWithDatabase={handleSyncDatabase}
                />

                {/* Status Modal */}
                {isStatusModalOpen && selectedGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)}>
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white font-russo">Статус группы</h3>
                                <button onClick={() => setIsStatusModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-2">Текущий статус</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'normal' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'normal'
                                                ? 'bg-green-500/20 border-green-500 text-green-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <Check size={20} />
                                            <span className="text-xs font-bold">Активна</span>
                                        </button>
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'cancelled' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'cancelled'
                                                ? 'bg-red-500/20 border-red-500 text-red-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <AlertTriangle size={20} />
                                            <span className="text-xs font-bold">Отмена</span>
                                        </button>
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'substitute' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'substitute'
                                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <RefreshCw size={20} />
                                            <span className="text-xs font-bold">Замена</span>
                                        </button>
                                    </div>
                                </div>

                                {(statusData.status === 'cancelled' || statusData.status === 'substitute') && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-white/40 text-xs font-bold mb-2">
                                            {statusData.status === 'cancelled' ? 'Причина отмены' : 'Комментарий'}
                                        </label>
                                        <input
                                            type="text"
                                            value={statusData.message}
                                            onChange={(e) => setStatusData({ ...statusData, message: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none"
                                            placeholder="Причина отмены или комментарий"
                                        />
                                    </div>
                                )}

                                {statusData.status === 'substitute' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-white/40 text-xs font-bold mb-2">Замена тренера</label>
                                        <select
                                            value={statusData.substituteCoachId}
                                            onChange={(e) => setStatusData({ ...statusData, substituteCoachId: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Выберите тренера...</option>
                                            {activeCoaches.map(coach => (
                                                <option key={coach.id} value={coach.id}>{coach.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveStatus}
                                    className="w-full bg-sparta-gold text-black font-bold py-3 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all mt-4"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Group Editor Modal */}
            {isEditorOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setIsEditorOpen(false)}
                >
                    <div
                        className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-3xl h-[88vh] max-h-[820px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 bg-[#16161a] shrink-0">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-white font-russo flex items-center gap-2">
                                        <SlidersHorizontal className="text-sparta-gold" size={18} />
                                        <span>{editingId ? (formData.name || 'Редактировать группу') : 'Новая группа'}</span>
                                    </h2>
                                    <p className="text-white/40 text-xs mt-0.5">
                                        {editingId ? 'Настройка расписания, параметров и состава группы' : 'Заполните параметры и создайте расписание'}
                                    </p>
                                </div>
                                <button onClick={() => setIsEditorOpen(false)} className="text-white/40 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs switcher */}
                            <div className="flex gap-1.5 p-1 bg-black/50 border border-white/10 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setDrawerTab('settings')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        drawerTab === 'settings'
                                            ? 'bg-sparta-gold text-black shadow-md font-black'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Settings size={13} />
                                    <span>Параметры & Расписание</span>
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => setDrawerTab('students')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                            drawerTab === 'students'
                                                ? 'bg-sparta-gold text-black shadow-md font-black'
                                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Users size={13} />
                                        <span>Состав ({users.filter(u => u.groupId === editingId).length + registry.filter(r => (String(r.groupId || r.targetGroupId).trim() === editingId) && r.status !== 'linked' && (!r.assignedUid || r.assignedUid === '')).length})</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#0c0c0e]">
                    {drawerTab === 'settings' ? (
                        /* === TAB 1: GROUP PARAMETERS & SCHEDULE BUILDER === */
                        <div className="space-y-6">
                            {/* 1. Basic Info Card */}
                            <div className="bg-[#151518] border border-white/10 rounded-2xl p-4 space-y-4">
                                <h3 className="text-white/90 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sparta-gold">
                                    <Sparkles size={14} /> Основные данные группы
                                </h3>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Название группы *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:border-sparta-gold outline-none"
                                        placeholder="Название группы"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-white/40 text-xs font-bold mb-1">Мин. возраст (лет)</label>
                                        <input
                                            type="number"
                                            value={formData.minAge}
                                            onChange={e => setFormData({ ...formData, minAge: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-sparta-gold outline-none"
                                            placeholder="От"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/40 text-xs font-bold mb-1">Макс. возраст (лет)</label>
                                        <input
                                            type="number"
                                            value={formData.maxAge}
                                            onChange={e => setFormData({ ...formData, maxAge: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-sparta-gold outline-none"
                                            placeholder="До"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Назначенный тренер</label>
                                    <select
                                        value={formData.coachId}
                                        onChange={e => setFormData({ ...formData, coachId: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-sparta-gold outline-none [&>option]:bg-black"
                                    >
                                        <option value="">-- Не назначен --</option>
                                        {activeCoaches.map(coach => (
                                            <option key={coach.id} value={coach.id}>
                                                {coach.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                                    <div>
                                        <label className="block text-white/40 text-xs font-bold mb-1">Лимит мест (Вместимость)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={formData.maxStudents}
                                                onChange={e => setFormData({ ...formData, maxStudents: e.target.value })}
                                                className="w-20 bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono text-center focus:border-sparta-gold outline-none"
                                            />
                                            <div className="flex gap-1">
                                                {['15', '20', '25', '30'].map(cnt => (
                                                    <button
                                                        key={cnt}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, maxStudents: cnt })}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                            formData.maxStudents === cnt
                                                                ? 'bg-sparta-gold text-black border-sparta-gold'
                                                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                                        }`}
                                                    >
                                                        {cnt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-white/40 text-xs font-bold mb-1">Статус группы</label>
                                        <div className="grid grid-cols-3 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, currentStatus: 'normal' })}
                                                className={`py-1.5 px-1 text-center rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                    formData.currentStatus === 'normal'
                                                        ? 'bg-green-500/20 border-green-500 text-green-400 font-black'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                                }`}
                                            >
                                                🟢 Активна
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, currentStatus: 'substitute' })}
                                                className={`py-1.5 px-1 text-center rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                    formData.currentStatus === 'substitute'
                                                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 font-black'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                                }`}
                                            >
                                                🟡 Замена
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, currentStatus: 'cancelled' })}
                                                className={`py-1.5 px-1 text-center rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                    formData.currentStatus === 'cancelled'
                                                        ? 'bg-red-500/20 border-red-500 text-red-400 font-black'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                                }`}
                                            >
                                                🔴 Отмена
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Schedule Builder Card */}
                            <div className="bg-[#151518] border border-white/10 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white/90 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sparta-gold">
                                        <Calendar size={14} /> Расписание тренировок
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addScheduleItem}
                                        className="text-xs bg-sparta-gold text-black font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-[#ffd700] transition-all"
                                    >
                                        <Plus size={13} /> Добавить тренировку
                                    </button>
                                </div>

                                {/* Quick Presets */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Шаблоны расписания Спарта:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset('sparta_mwf_19')}
                                            className="px-2 py-1 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/30 text-white/80 hover:text-sparta-gold text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            ⚡ Пн, Ср, Пт 19:00–20:00
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset('sparta_mwf_20')}
                                            className="px-2 py-1 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/30 text-white/80 hover:text-sparta-gold text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            ⚡ Пн, Ср, Пт 20:00–21:00
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset('sparta_we_12')}
                                            className="px-2 py-1 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/30 text-white/80 hover:text-sparta-gold text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            ⚡ Сб, Вс 12:00–13:00
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset('sparta_we_13')}
                                            className="px-2 py-1 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/30 text-white/80 hover:text-sparta-gold text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            ⚡ Сб, Вс 13:00–14:00
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySchedulePreset('sparta_we_14')}
                                            className="px-2 py-1 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/30 text-white/80 hover:text-sparta-gold text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                        >
                                            ⚡ Сб, Вс 14:00–15:00
                                        </button>
                                    </div>
                                </div>

                                {/* Schedule Slots List */}
                                <div className="space-y-3 pt-2">
                                    {formData.schedule.map((item, index) => (
                                        <div key={index} className="bg-black/50 border border-white/10 hover:border-white/20 rounded-xl p-3 space-y-2.5 transition-all">
                                            <div className="flex items-center justify-between gap-2">
                                                {/* Day selection */}
                                                <select
                                                    value={item.day}
                                                    onChange={e => updateSchedule(index, 'day', e.target.value)}
                                                    className="bg-[#18181b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-bold focus:border-sparta-gold outline-none"
                                                >
                                                    {daysOfWeek.map(day => (
                                                        <option key={day} value={day}>{day}</option>
                                                    ))}
                                                </select>

                                                {/* Time range: start and end */}
                                                <div className="flex items-center gap-1.5 text-xs text-white/40">
                                                    <Clock size={13} />
                                                    <input
                                                        type="time"
                                                        value={item.time}
                                                        onChange={e => updateSchedule(index, 'time', e.target.value)}
                                                        className="bg-[#18181b] border border-white/10 rounded-lg px-1.5 py-0.5 text-xs text-white font-mono focus:border-sparta-gold outline-none"
                                                    />
                                                    <span>—</span>
                                                    <input
                                                        type="time"
                                                        value={item.endTime || ''}
                                                        onChange={e => updateSchedule(index, 'endTime', e.target.value)}
                                                        placeholder="Конец"
                                                        className="bg-[#18181b] border border-white/10 rounded-lg px-1.5 py-0.5 text-xs text-white font-mono focus:border-sparta-gold outline-none"
                                                    />
                                                </div>

                                                {/* Delete slot button */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeScheduleItem(index)}
                                                    className="text-white/30 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                                    title="Удалить этот слот"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Activity & Location Row */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={item.activity}
                                                        onChange={e => updateSchedule(index, 'activity', e.target.value)}
                                                        placeholder="Вид спорта"
                                                        className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-sparta-gold outline-none placeholder:text-white/20"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={item.location || ''}
                                                        onChange={e => updateSchedule(index, 'location', e.target.value)}
                                                        placeholder="Зал или локация"
                                                        className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-sparta-gold outline-none placeholder:text-white/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {formData.schedule.length === 0 && (
                                        <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
                                            <Calendar size={24} className="mx-auto mb-1.5 text-white/20" />
                                            <p>Расписание тренировок еще не настроено.</p>
                                            <p className="text-[11px] text-white/20 mt-0.5">Выберите быстрый шаблон выше или нажмите «Добавить тренировку».</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* === TAB 2: STUDENTS IN GROUP === */
                        <div className="space-y-4">
                            {/* Student Header */}
                            {(() => {
                                const realUsers = users.filter(u => u.groupId === editingId);
                                const ghostUsers = registry.filter(r =>
                                    (String(r.groupId || r.targetGroupId).trim() === editingId) &&
                                    r.status !== 'linked' &&
                                    (!r.assignedUid || r.assignedUid === '')
                                );
                                const allMembers = [
                                    ...realUsers.map(u => {
                                        const hasActivePass = Boolean((u as any).hasActiveMembership || ((u as any).membershipExpires && new Date((u as any).membershipExpires) > new Date()));
                                        return {
                                            id: u.id,
                                            childName: u.childName || (u as any).displayName || (u as any).name || 'Ученик',
                                            childAge: u.childAge || (u as any).age || 0,
                                            parentName: u.parentName || (u as any).parentFullName || '',
                                            parentPhone: u.parentPhone || (u as any).phone || '',
                                            hasActiveMembership: hasActivePass,
                                            membershipExpires: (u as any).membershipExpires,
                                            _type: 'real' as const
                                        };
                                    }),
                                    ...ghostUsers.map(r => ({
                                        id: r.id,
                                        childName: r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() || r.childName || r.originalName || 'Ученик',
                                        childAge: r.childAge || r.age || 0,
                                        parentName: r.parentName || '',
                                        parentPhone: r.parentPhone || '',
                                        hasActiveMembership: false,
                                        membershipExpires: null,
                                        _type: 'ghost' as const
                                    }))
                                ];

                                return (
                                    <>
                                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-white/90 font-bold text-xs">Всего в группе: {allMembers.length}</h3>
                                                {allMembers.length > 0 && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            checked={allMembers.length > 0 && allMembers.every(u => selectedUserIds.includes(u.id))}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedUserIds(allMembers.map(u => u.id));
                                                                } else {
                                                                    setSelectedUserIds([]);
                                                                }
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-white/20 bg-black/50 cursor-pointer"
                                                        />
                                                        <span className="text-[11px] text-white/40">Выбрать всех</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {selectedUserIds.length > 0 && (
                                                    <button
                                                        onClick={() => setIsRemoveModalOpen(true)}
                                                        className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 size={13} /> Исключить ({selectedUserIds.length})
                                                    </button>
                                                )}
                                                {editingId && (
                                                    <button
                                                        onClick={() => {
                                                            const currentGroup = groups.find(g => g.id === editingId);
                                                            if (currentGroup) exportGroupToExcel(currentGroup);
                                                        }}
                                                        className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                                                        title="Скачать состав группы в Excel"
                                                    >
                                                        <Download size={13} /> Excel
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIsAddStudentModalOpen(true)}
                                                    className="text-xs bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                                                >
                                                    <Plus size={13} /> Добавить
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {allMembers.length === 0 ? (
                                                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl text-white/30 text-xs">
                                                    <Users size={28} className="mx-auto mb-2 text-white/20" />
                                                    <p>В этой группе пока нет учеников.</p>
                                                    <p className="text-[11px] text-white/20 mt-1">Используйте кнопку «Добавить» или импортируйте список из Excel.</p>
                                                </div>
                                            ) : (
                                                allMembers.map(member => (
                                                    <div key={member.id} className={`flex items-center justify-between bg-black/40 hover:bg-black/60 border border-white/5 p-3 rounded-xl transition-colors ${selectedUserIds.includes(member.id) ? 'bg-sparta-gold/10 border-sparta-gold/30' : ''}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserIds.includes(member.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedUserIds(prev => [...prev, member.id]);
                                                                    } else {
                                                                        setSelectedUserIds(prev => prev.filter(id => id !== member.id));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-white/20 bg-black/50 cursor-pointer shrink-0"
                                                            />
                                                            <div className={`overflow-hidden ${member._type === 'ghost' ? 'opacity-70' : ''}`}>
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="text-white text-xs font-bold truncate">{member.childName}</p>
                                                                    {member._type === 'ghost' ? (
                                                                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold flex items-center gap-0.5 shrink-0" title="Ожидает первого входа">
                                                                            <Clock size={9} /> Ожидает
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                                                                                <Check size={9} /> В базе
                                                                            </span>
                                                                            {member.hasActiveMembership && (
                                                                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-0.5 shrink-0" title="Активный абонемент">
                                                                                    🎟️ Абонемент
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-white/40 text-[11px] truncate">
                                                                    {member.childAge ? `${member.childAge} лет` : ''}
                                                                    {member.parentPhone ? ` • ${member.parentPhone}` : ''}
                                                                    {member.parentName ? ` (${member.parentName})` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => member._type === 'real' && handleOpenGrantModal(member.id)}
                                                            disabled={member._type === 'ghost'}
                                                            className={`p-2 rounded-lg transition-colors shrink-0 ml-2 ${member._type === 'ghost' ? 'text-white/10 cursor-not-allowed' : 'bg-sparta-gold/10 text-sparta-gold hover:bg-sparta-gold/20 cursor-pointer'}`}
                                                            title={member._type === 'ghost' ? "Пользователь еще не зарегистрирован на сайте" : "Выдать награду"}
                                                        >
                                                            <Trophy size={15} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-[#16161a] flex items-center gap-3 shrink-0">
                    {editingId && (
                        <button
                            type="button"
                            onClick={handleDeleteGroup}
                            disabled={processing}
                            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shrink-0"
                            title="Удалить группу"
                        >
                            <Trash2 size={15} />
                            <span>Удалить</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs shrink-0"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={processing}
                        className="flex-1 bg-sparta-gold text-black font-bold py-2.5 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs shadow-lg"
                    >
                        {processing ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                        <span>{editingId ? 'Сохранить изменения' : 'Создать группу'}</span>
                    </button>
                </div>
            </div>
        </div>
    )}

            {/* Grant Modal */}
            {
                isGrantModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        {/* ... (existing grant modal content) ... */}
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white font-russo">Выдать награду</h2>
                                <button onClick={() => setIsGrantModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Выберите награду</label>
                                    <select
                                        value={selectedAchievementId}
                                        onChange={(e) => setSelectedAchievementId(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                    >
                                        <option value="">-- Не выбрано --</option>
                                        {definitions.map(def => (
                                            <option key={def.id} value={def.id}>{def.title} ({def.rarity})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Причина / Комментарий</label>
                                    <textarea
                                        value={grantReason}
                                        onChange={(e) => setGrantReason(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none h-24 resize-none"
                                        placeholder="Причина выдачи награды"
                                    />
                                </div>

                                {successMessage && isGrantModalOpen && (
                                    <div className="p-3 bg-green-500/10 text-green-400 rounded-lg text-sm flex items-center gap-2">
                                        <Check size={16} /> {successMessage}
                                    </div>
                                )}

                                <button
                                    onClick={handleGrantAchievement}
                                    disabled={processing || !selectedAchievementId}
                                    className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    {processing ? <RefreshCw className="animate-spin" size={20} /> : <Trophy size={20} />}
                                    Наградить
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Student Modal */}
            {
                isAddStudentModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-xl font-bold text-white font-russo">Добавить ученика</h2>
                                <button onClick={() => setIsAddStudentModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    type="text"
                                    placeholder="Поиск по имени или фамилии..."
                                    value={studentSearchQuery}
                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-sparta-gold outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {users
                                    .filter(u => !u.groupId || u.groupId !== editingId) // Not in this group
                                    .filter(u => u.childName?.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                    .slice(0, 50)
                                    .map(user => (
                                        <div key={user.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                                            <div>
                                                <p className="text-white font-bold">{user.childName}</p>
                                                <p className="text-white/40 text-xs">
                                                    {user.childAge} лет • {user.groupId ? 'В другой группе' : 'Без группы'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleAddStudentToGroup(user.id)}
                                                className="px-4 py-2 bg-sparta-gold/10 text-sparta-gold rounded-lg hover:bg-sparta-gold hover:text-black font-bold text-sm transition-all"
                                            >
                                                Добавить
                                            </button>
                                        </div>
                                    ))}
                                {users.filter(u => u.childName?.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                                    <p className="text-center text-white/30 py-8">Пользователи не найдены</p>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Grant Modal - omitted for brevity if unchanged */}

            {/* ... */}

            {/* Delete Group Confirmation Dialog could be added here if we wanted a custom one, but using window.confirm for now as per plan */}



            {/* Remove Confirmation Modal */}
            {
                isRemoveModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white font-russo">Исключение из группы</h2>
                                <button onClick={() => setIsRemoveModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-white text-sm">
                                        Вы собираетесь исключить <strong>{selectedUserIds.length}</strong> учеников из группы.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Причина исключения (опционально)</label>
                                    <textarea
                                        value={removeReason}
                                        onChange={(e) => setRemoveReason(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none h-24 resize-none"
                                        placeholder="Причина исключения"
                                    />
                                    <p className="text-white/20 text-xs mt-1">
                                        ⚠️ Если указать причину, ученики получат уведомление. Если оставить пустым — исключение пройдет "тихо".
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setIsRemoveModalOpen(false)}
                                        className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleRemoveUsers}
                                        disabled={processing}
                                        className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        {processing ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                        Исключить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Global & Group Force Majeure Modal */}
            <ScheduleOverrideModal
                isOpen={isOverrideModalOpen}
                onClose={() => {
                    setIsOverrideModalOpen(false);
                    setOverrideTargetGroup(null);
                }}
                defaultGroupId={overrideTargetGroup?.id}
                defaultGroupName={overrideTargetGroup?.name}
                creatorName="Администратор"
                availableGroups={groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    coachName: coaches.find(c => c.id === g.coachId)?.name || (g as any).coachName
                }))}
            />

            {/* Sparta Messenger Schedule Broadcast Modal */}
            <ScheduleMessengerPublishModal
                isOpen={isPublishMessengerModalOpen}
                onClose={() => {
                    setIsPublishMessengerModalOpen(false);
                    setPublishMessengerTargetGroup(null);
                }}
                groups={groups}
                coaches={activeCoaches}
                defaultGroup={publishMessengerTargetGroup}
            />

            {/* Bulk Coach Assignment Modal */}
            {isBulkCoachModalOpen && (
                <div
                    className="admin-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsBulkCoachModalOpen(false); }}
                >
                    <div className="bg-[#111113] border border-sparta-gold/30 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in zoom-in-95 font-manrope">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-russo text-white text-lg flex items-center gap-2">
                                    <span className="text-sparta-gold">👔</span>
                                    <span>Массовое назначение тренера</span>
                                </h3>
                                <p className="text-xs text-white/60 mt-1">
                                    Выбранный наставник будет назначен для <strong className="text-sparta-gold">{selectedGroupIds.length}</strong> групп. Групповые чаты и расписание синхронизируются автоматически.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsBulkCoachModalOpen(false)}
                                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Selected Groups Chips */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 font-bold uppercase tracking-wider block">
                                Выбранные группы:
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                                {selectedGroupIds.map(gid => {
                                    const g = groups.find(item => item.id === gid);
                                    return (
                                        <span key={gid} className="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-semibold font-russo flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sparta-gold" />
                                            {g?.name || gid}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Coach Selector */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/60 font-bold uppercase tracking-wider block">
                                Выберите тренера:
                            </label>
                            <select
                                value={bulkSelectedCoachId}
                                onChange={e => setBulkSelectedCoachId(e.target.value)}
                                className="w-full bg-[#18181b] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-sparta-gold transition-colors cursor-pointer"
                            >
                                {activeCoaches.map(c => (
                                    <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                                        {c.name} ({c.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsBulkCoachModalOpen(false)}
                                disabled={isBulkAssigning}
                                className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkAssignCoach}
                                disabled={isBulkAssigning || !bulkSelectedCoachId}
                                className="flex-[2] py-3 px-5 rounded-xl bg-gradient-to-r from-sparta-gold to-amber-500 hover:brightness-110 text-black font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-russo"
                            >
                                {isBulkAssigning ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={16} />
                                        <span>Назначение...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Применить к {selectedGroupIds.length} группам</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Express Coach-to-Coach Transfer Modal */}
            {isExpressTransferModalOpen && (
                <div
                    className="admin-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsExpressTransferModalOpen(false); }}
                >
                    <div className="bg-[#111113] border border-sparta-gold/30 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in zoom-in-95 font-manrope">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-russo text-white text-lg flex items-center gap-2">
                                    <span className="text-sparta-gold">🔄</span>
                                    <span>Экспресс-передача групп</span>
                                </h3>
                                <p className="text-xs text-white/60 mt-1">
                                    Быстрая передача всех составов от одного тренера другому без ручного выбора чекбоксами.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsExpressTransferModalOpen(false)}
                                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Step 1: From Coach */}
                        <div className="space-y-2">
                            <label className="text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span>1. С какого тренера передать:</span>
                            </label>
                            <select
                                value={expressFromCoachId}
                                onChange={e => {
                                    const nextFrom = e.target.value;
                                    setExpressFromCoachId(nextFrom);
                                    if (expressToCoachId === nextFrom) {
                                        const other = activeCoaches.find(c => c.id !== nextFrom);
                                        if (other) setExpressToCoachId(other.id);
                                    }
                                }}
                                className="w-full bg-[#18181b] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
                            >
                                {activeCoaches.map(c => {
                                    const coachGroupCount = groups.filter(g => 
                                        g.coachId === c.id || 
                                        (c.name && (g.coachName || '').trim().toLowerCase() === c.name.trim().toLowerCase())
                                    ).length;
                                    return (
                                        <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                                            {c.name} ({coachGroupCount} {coachGroupCount === 1 ? 'группа' : coachGroupCount >= 2 && coachGroupCount <= 4 ? 'группы' : 'групп'})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Step 2: To Coach */}
                        <div className="space-y-2">
                            <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span>2. Кому передать (новый наставник):</span>
                            </label>
                            <select
                                value={expressToCoachId}
                                onChange={e => setExpressToCoachId(e.target.value)}
                                className="w-full bg-[#18181b] border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
                            >
                                {activeCoaches
                                    .filter(c => c.id !== expressFromCoachId)
                                    .map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                                            {c.name} ({c.role})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Transferable Groups Preview */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-wider">
                                    Будут переданы составы ({expressTransferableGroups.length}):
                                </label>
                            </div>

                            {expressTransferableGroups.length > 0 ? (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    {expressTransferableGroups.map(g => {
                                        const count = users.filter(u => u.groupId === g.id).length;
                                        return (
                                            <div
                                                key={g.id}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sparta-gold shrink-0" />
                                                    <span className="text-white font-semibold font-russo">{g.name}</span>
                                                    <span className="text-white/40 text-[11px] font-sans">({g.ageRange?.min || 0}–{g.ageRange?.max || 18} лет)</span>
                                                </div>
                                                <span className="text-white/60 font-mono text-[11px]">
                                                    {count} учеников
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-white/40">
                                    У выбранного тренера сейчас нет привязанных групп.
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsExpressTransferModalOpen(false)}
                                disabled={isExpressTransferring}
                                className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleExpressTransfer}
                                disabled={isExpressTransferring || expressTransferableGroups.length === 0 || !expressToCoachId || expressFromCoachId === expressToCoachId}
                                className="flex-[2] py-3 px-5 rounded-xl bg-gradient-to-r from-sparta-gold to-amber-500 hover:brightness-110 text-black font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-russo"
                            >
                                {isExpressTransferring ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={16} />
                                        <span>Передача...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft size={16} />
                                        <span>Передать все составы ({expressTransferableGroups.length})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminGroups;