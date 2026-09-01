import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Users,
    Calendar,
    CheckCircle,
    Clock,
    TrendingUp,
    Search,
    ChevronRight,
    Dumbbell,
    MessageSquare,
    Zap,
    LayoutDashboard,
    Star,
    Award,
    ChevronDown,
    Save as SaveIcon,
    Info,
    PlusCircle,
    X,
    FileSpreadsheet,
    FileText,
    Bell,
    Settings,
    Upload,
    Video as VideoIcon,
    File as FileIcon,
    Paperclip,
    Smile,
    RotateCcw,
    Image as ImageIcon,
    Sparkles,
    Filter,
    Layers,
    Play,
    BookOpen,
    RefreshCw,
    Loader2,
    Lock,
    Brain,
    User,
    Phone,
    Activity as ActivityIcon,
    Share,
    ArrowRightLeft,
    UserPlus,
    Plus,
    Mail,
    HelpCircle,
    Pencil,
    Edit2,
    Copy,
    Trash2 as TrashIcon,
    Camera,
    GripVertical,
    Target,
    Trophy,
    Shield,
    ArrowLeft,
    FolderOpen,
    ArrowRight,
    XCircle,
    MousePointer2,
    Link as LinkIcon,
    Maximize2,
    Check,
    CheckSquare
} from 'lucide-react';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
    arrayUnion
} from 'firebase/firestore';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GlassCard, Button } from '../UIComponents';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import CoachChat from './CoachChat';
import CoachCalendar from './CoachCalendar';
import DailyHub from './coach/DailyHub';
import RosterJournalTab from './coach/RosterJournalTab';
import CoachReviewDashboard from './coach/CoachReviewDashboard';
import TrialsTab from './coach/TrialsTab';
import MessagesTab from './coach/MessagesTab';
import StatsLab from './coach/StatsLab';
import StudentProfileModal from './coach/StudentProfileModal';
import { AssignmentModal } from './coach/AssignmentModal';
import confetti from 'canvas-confetti';
import { useCoachAnalytics } from '../../hooks/useCoachAnalytics';
import { getSmartSubscriptionStatus, checkProfileCompleteness } from '../../utils/subscriptionStatusEngine';

const MUSCLE_GROUPS = [
    { id: 'chest', label: 'Грудь', icon: '👕' },
    { id: 'back', label: 'Спина', icon: '🦇' },
    { id: 'shoulders', label: 'Плечи', icon: '🛡️' },
    { id: 'biceps', label: 'Бицепс', icon: '💪' },
    { id: 'triceps', label: 'Трицепс', icon: '🏹' },
    { id: 'core', label: 'Пресс / Кор', icon: '🧱' },
    { id: 'quads', label: 'Квадрицепс', icon: '🦵' },
    { id: 'hamstrings', label: 'Бицепс бедра', icon: '🏃' },
    { id: 'calves', label: 'Голень', icon: '🦶' },
    { id: 'glutes', label: 'Ягодицы', icon: '🍑' },
    { id: 'fullbody', label: 'Все тело', icon: '🔥' }
];

const EXERCISE_CATEGORIES = [
    { id: 'all', label: 'Все', icon: Layers },
    { id: 'technique', label: 'Техника', icon: Zap },
    { id: 'strength', label: 'Сила', icon: Dumbbell },
    { id: 'speed', label: 'Скорость', icon: Zap },
    { id: 'endurance', label: 'Выносливость', icon: Clock },
    { id: 'flexibility', label: 'Гибкость', icon: Star },
    { id: 'recovery', label: 'Восстановление', icon: Sparkles }
];

const DEFAULT_EXERCISES = [
    {
        title: 'Базовый дриблинг',
        description: 'Ведение мяча внутренней и внешней стороной стопы между фишками. Развивает чувство мяча и координацию.',
        category: 'technique',
        level: 'beginner',
        equipment: ['Мяч', 'Фишки'],
        muscles: ['quads', 'calves'],
        mediaType: 'url',
        mediaUrl: 'https://www.youtube.com/watch?v=qX9O7WnScl0',
        usageCount: 0
    },
    {
        title: 'Разминка: Бег с высоким подниманием колен',
        description: 'Классическое упражнение для разогрева мышцц ног и подготовки сердечно-сосудистой системы.',
        category: 'recovery',
        level: 'beginner',
        equipment: [],
        muscles: ['quads', 'core'],
        mediaType: 'url',
        mediaUrl: 'https://www.youtube.com/watch?v=vVj4u_6a1vI',
        usageCount: 0
    },
    {
        title: 'Силовая: Планка',
        description: 'Статическое упражнение для укрепления мышцц кора, плечевого пояса и ног.',
        category: 'strength',
        level: 'intermediate',
        equipment: ['Коврик'],
        muscles: ['core', 'shoulders'],
        mediaType: 'url',
        mediaUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
        usageCount: 0
    }
];

interface CoachSectionProps {
    userProfile: any;
    user?: any;
    initialSubTab?: 'dashboard' | 'groups' | 'messages' | 'stats' | 'calendar' | 'exercises' | 'programs' | 'trials';
}

const CoachSection: React.FC<CoachSectionProps> = ({ userProfile, initialSubTab }) => {
    const calculateAge = (birthDate: any) => {
        if (!birthDate) return 0;
        try {
            const birth = typeof birthDate === 'string' ? parseISO(birthDate) :
                (birthDate instanceof Date ? birthDate :
                    (birthDate.toDate ? birthDate.toDate() : new Date(birthDate)));
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
            return age;
        } catch (e) {
            if (typeof birthDate === 'number' && birthDate > 1900 && birthDate < 2100) {
                return new Date().getFullYear() - birthDate;
            }
            return 0;
        }
    };

    const isCompleteProfile = (student: any) => {
        return checkProfileCompleteness(student).isComplete;
    };

    const { user } = useAuth();
    const { theme } = useTheme();
    const coachDisplayName = userProfile?.displayName || userProfile?.name || userProfile?.firstName || 'Тренер';
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState<'dashboard' | 'journal' | 'review' | 'trials' | 'materials' | 'groups' | 'messages' | 'stats' | 'calendar' | 'exercises' | 'programs'>((initialSubTab as any) || 'dashboard');
    const [materialsSubTab, setMaterialsSubTab] = useState<'exercises' | 'programs' | 'calendar'>('exercises');

    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [allGroups, setAllGroups] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeGroups: 0,
        avgAttendance: 0
    });
    const [groupSkillAverages, setGroupSkillAverages] = useState<any>(null);
    const [upcomingTraining, setUpcomingTraining] = useState<any>(null);
    const [activeSubTab, setActiveSubTab] = useState<'roster' | 'journal' | 'homework'>('roster');
    const [attendanceDate, setAttendanceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [attendanceRecords, setAttendanceRecords] = useState<{ [studentId: string]: any }>({});
    const [savedAttendanceRecords, setSavedAttendanceRecords] = useState<{ [studentId: string]: any }>({});
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [isSavingAttendance, setIsSavingAttendance] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentForDev, setSelectedStudentForDev] = useState<any>(null);
    const [isDevModalOpen, setIsDevModalOpen] = useState(false);
    const [tempSkills, setTempSkills] = useState({
        technique: 50,
        strength: 50,
        endurance: 50,
        discipline: 50,
        flexibility: 50
    });
    const [selectedExercisesForTemplate, setSelectedExercisesForTemplate] = useState<string[]>([]);
    const [availableAchievements, setAvailableAchievements] = useState<any[]>([]);
    const [totalExercisesCount, setTotalExercisesCount] = useState(0);
    const [isSavingDev, setIsSavingDev] = useState(false);
    const [selectedStudentForChat, setSelectedStudentForChat] = useState<any>(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isManageChatOpen, setIsManageChatOpen] = useState(false);
    const [editingChat, setEditingChat] = useState<any>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [selectedMediaForLightbox, setSelectedMediaForLightbox] = useState<{
        items: Array<{ url: string, type: 'video' | 'photo' | 'url' }>,
        currentIndex: number,
        title: string
    } | null>(null);
    const [activeChats, setActiveChats] = useState<any[]>([]);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [onlineStatuses, setOnlineStatuses] = useState<Record<string, any>>({});
    const [groupAnnouncements, setGroupAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
    const [eventsFeed, setEventsFeed] = useState<any[]>([]);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [homeworkTasks, setHomeworkTasks] = useState<any[]>([]);
    const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', rewardXp: 50 });
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
    const [rosterFilter, setRosterFilter] = useState<'all' | 'active' | 'trial' | 'at_risk' | 'registered' | 'awaiting' | 'offline' | 'incomplete'>('all');
    const [isSplitTeamsModalOpen, setIsSplitTeamsModalOpen] = useState(false);
    const [teams, setTeams] = useState<{ teamA: any[], teamB: any[] }>({ teamA: [], teamB: [] });
    const [trainingPlan, setTrainingPlan] = useState<any[]>([]);

    const [trialRequests, setTrialRequests] = useState<any[]>([]);
    const [selectedTrialRequest, setSelectedTrialRequest] = useState<any>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);
    const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<any>(null);
    const [selectedEvalTags, setSelectedEvalTags] = useState<string[]>([]);
    const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
    const [coachEvalComment, setCoachEvalComment] = useState('');
    const [enrollingGroupId, setEnrollingGroupId] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [studentToTransfer, setStudentToTransfer] = useState<{ id: string, name: string, type: 'real' | 'ghost' } | null>(null);
    const [targetTransferGroupId, setTargetTransferGroupId] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const [exercises, setExercises] = useState<any[]>([]);
    const [hoveredExerciseId, setHoveredExerciseId] = useState<string | null>(null);
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any>(null);
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
    const [selectedExerciseCategory, setSelectedExerciseCategory] = useState('all');
    const [exerciseCollections, setExerciseCollections] = useState<any[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | 'all'>('all');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<any>(null);
    const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
    const [clipboardIds, setClipboardIds] = useState<string[]>([]);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [newCollectionData, setNewCollectionData] = useState({ title: '', color: '#D4AF37' });
    const [newExerciseData, setNewExerciseData] = useState({
        title: '',
        description: '',
        category: 'technique',
        level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        equipment: [] as string[],
        muscles: [] as string[],
        collectionId: 'all' as string,
        videoUrl: '',
        mediaType: 'url' as 'url' | 'video' | 'photo',
        usageCount: 0,
        mediaItems: [] as Array<{ id: string, file?: File, url: string, type: 'video' | 'photo' | 'url', angle?: string }>
    });
    const [currentExerciseStep, setCurrentExerciseStep] = useState(1);
    const [isSavingExercise, setIsSavingExercise] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDraggingFiles, setIsDraggingFiles] = useState(false);
    const [isExerciseGuideOpen, setIsExerciseGuideOpen] = useState(false);

    const [trainingTemplates, setTrainingTemplates] = useState<any[]>([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isDraggingToTemplate, setIsDraggingToTemplate] = useState(false);

    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignmentTask, setEditingAssignmentTask] = useState<any | null>(null);
    const [assigningItem, setAssigningItem] = useState<any>(null);
    const [assignmentTargetType, setAssignmentTargetType] = useState<'group' | 'student'>('group');
    const [selectedAssignmentTarget, setSelectedAssignmentTarget] = useState<string | null>(null);
    const [assignmentTargetStudentId, setAssignmentTargetStudentId] = useState<string | null>(null);
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDescription, setAssignmentDescription] = useState('');
    const [assignmentRewardXp, setAssignmentRewardXp] = useState<number>(30);
    const [assignmentDeadline, setAssignmentDeadline] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return format(d, 'yyyy-MM-dd');
    });
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
    const [isSavingAssignment, setIsSavingAssignment] = useState(false);
    const [selectedProgramForPreview, setSelectedProgramForPreview] = useState<any>(null);
    const [programExerciseSearch, setProgramExerciseSearch] = useState('');

    const [newTemplateData, setNewTemplateData] = useState({
        title: '',
        description: '',
        intensity: 'medium',
        duration: '4',
        category: 'technique',
        stages: {
            warmup: [] as string[],
            main: [] as string[],
            skills: [] as string[],
            cooldown: [] as string[]
        },
        coverImage: '',
        gallery: [] as string[],
        intensityCurve: [30, 50, 80, 45] as number[]
    });
    const [showTemplateUrlInput, setShowTemplateUrlInput] = useState(false);
    const [activeConstructorStage, setActiveConstructorStage] = useState<'warmup' | 'main' | 'skills' | 'cooldown'>('main');

    const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [studentProfileLoading, setStudentProfileLoading] = useState(false);
    const [studentActivityLog, setStudentActivityLog] = useState<any[]>([]);
    const [studentProfileStats, setStudentProfileStats] = useState({ present: 0, absent: 0, total: 0, rate: 0 });

    const [isTrialFeedbackOpen, setIsTrialFeedbackOpen] = useState(false);
    const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
    const [selectedTrialForEval, setSelectedTrialForEval] = useState<any>(null);
    const [currentEvalSkills, setCurrentEvalSkills] = useState({
        technique: 50, strength: 50, speed: 50, endurance: 50, discipline: 50
    });
    const [trialEvaluations, setTrialEvaluations] = useState<Record<string, any>>({});
    const [comparingTrialId, setComparingTrialId] = useState<string | null>(null);
    const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<any>(null);
    const [trialFeedback, setTrialFeedback] = useState({ rating: 8, note: '', recommendation: 'accept' });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);

    const [isSmartSorted, setIsSmartSorted] = useState(false);
    const [sortingStatus, setSortingStatus] = useState<'idle' | 'scanning' | 'linking' | 'cleaning' | 'done'>('idle');

    const [allStudentsData, setAllStudentsData] = useState<any[]>([]);
    const [allUsersData, setAllUsersData] = useState<any[]>([]);
    const [allRegistryData, setAllRegistryData] = useState<any[]>([]);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);

    const isAdmin = React.useMemo(() =>
        ['admin', 'director', 'developer'].includes(userProfile?.role?.toLowerCase()),
        [userProfile?.role]);

    const isCoach = !!userProfile?.coachId;

    // Strict student filter: exclude coaches, admins, trainers, and current coach
    const isStudentUser = React.useCallback((u: any) => {
        if (!u) return false;
        const role = (u.role || '').toLowerCase().trim();
        // Exclude coach and admin roles
        if (['coach', 'trainer', 'admin', 'director', 'developer', 'staff', 'manager'].includes(role)) {
            return false;
        }
        if (u.isCoach === true || u.isTrainer === true || u.isAdmin === true) {
            return false;
        }
        // Exclude current logged in coach by ID/uid
        if (userProfile?.coachId && (u.id === userProfile.coachId || u.uid === userProfile.coachId || u.coachId === u.id)) {
            return false;
        }
        if (userProfile?.id && (u.id === userProfile.id || u.uid === userProfile.id)) {
            return false;
        }
        // Exclude known coaches by full/partial name
        const name = (u.displayName || u.childName || u.name || '').trim().toLowerCase();
        if (!name) return false;
        if (
            name.includes('кубарь сергей') ||
            name.includes('пономарев сергей') ||
            name.includes('пономарёв сергей') ||
            name.includes('якупов павел') ||
            name.includes('меньшиков антон') ||
            name.includes('лебедев александр')
        ) {
            return false;
        }
        return true;
    }, [userProfile]);

    // Unified & Deduplicated Students Array across Firestore sources
    const myStudents = React.useMemo(() => {
        const studentMap = new Map<string, any>();
        const nameGroupKey = (name: string, groupId: string) => `${name.trim().toLowerCase()}___${String(groupId || '').trim().toLowerCase()}`;
        const nameKeys = new Set<string>();

        // 1. Process 'students' collection records
        (allStudentsData || []).forEach(s => {
            if (!s) return;
            if (!isStudentUser(s)) return;

            const id = s.id || s.uid || s.studentId;
            if (!id) return;

            const stdName = s.name || s.childName || s.displayName || 'Спортсмен';
            const gId = s.groupId || s.group || '';

            const item = {
                ...s,
                id,
                uid: s.uid || id,
                studentId: s.studentId || id,
                name: stdName,
                childName: s.childName || stdName,
                groupId: gId,
                coachId: s.coachId,
                sport: s.sport || 'football',
                phone: s.phone || s.parentPhone || '',
                type: s.type || (s.isRegistered ? 'real' : 'offline'),
                isRegistered: !!s.isRegistered,
                status: s.status || 'active',
                paymentStatus: s.paymentStatus || 'due',
                paymentDate: s.paymentDate || null,
                skills: s.skills || { technique: 75, strength: 75, speed: 75, endurance: 75, discipline: 75 },
                originalUser: s
            };

            studentMap.set(id, item);
            if (stdName && gId) {
                nameKeys.add(nameGroupKey(stdName, gId));
            }
        });

        // 2. Process 'users' collection (registered app users)
        (allUsersData || []).forEach(u => {
            if (!u) return;
            if (!isStudentUser(u)) return;

            const id = u.id || u.uid;
            if (!id) return;

            const stdName = u.childName || u.displayName || u.name || 'Спортсмен';
            const gId = u.groupId || (Array.isArray(u.groups) ? u.groups[0] : '') || '';
            const key = nameGroupKey(stdName, gId);

            if (studentMap.has(id)) {
                // Merge registered data into existing record
                const existing = studentMap.get(id);
                studentMap.set(id, {
                    ...existing,
                    ...u,
                    id,
                    name: stdName,
                    isRegistered: true,
                    type: existing.type === 'trial' ? 'trial' : 'registered',
                    paymentStatus: u.paymentStatus || existing.paymentStatus || 'due',
                    originalUser: { ...(existing.originalUser || {}), ...u }
                });
                return;
            }

            if (gId && nameKeys.has(key)) {
                // Find and update existing student with registered info
                for (const [existingId, existing] of studentMap.entries()) {
                    if (nameGroupKey(existing.name, existing.groupId) === key) {
                        studentMap.set(existingId, {
                            ...existing,
                            ...u,
                            id: existingId,
                            uid: id,
                            isRegistered: true,
                            type: existing.type === 'trial' ? 'trial' : 'registered',
                            originalUser: { ...(existing.originalUser || {}), ...u }
                        });
                        break;
                    }
                }
                return;
            }

            const item = {
                ...u,
                id,
                uid: id,
                studentId: u.studentId || id,
                name: stdName,
                childName: stdName,
                groupId: gId,
                coachId: u.coachId,
                sport: u.sport || 'football',
                phone: u.phone || u.parentPhone || '',
                type: 'registered',
                isRegistered: true,
                status: u.status || 'active',
                paymentStatus: u.paymentStatus || 'due',
                paymentDate: u.paymentDate || null,
                skills: u.skills || { technique: 75, strength: 75, speed: 75, endurance: 75, discipline: 75 },
                originalUser: u
            };

            studentMap.set(id, item);
            if (stdName && gId) {
                nameKeys.add(key);
            }
        });

        // 3. Process 'student_registry' records
        (allRegistryData || []).forEach(r => {
            if (!r) return;
            if (!isStudentUser(r)) return;

            const id = r.id || r.uid || r.studentId;
            if (!id) return;

            const stdName = r.name || r.childName || 'Спортсмен';
            const gId = r.groupId || '';
            const key = nameGroupKey(stdName, gId);

            if (studentMap.has(id) || (gId && nameKeys.has(key))) {
                return; // Already accounted for
            }

            const item = {
                ...r,
                id,
                uid: id,
                studentId: id,
                name: stdName,
                childName: stdName,
                groupId: gId,
                coachId: r.coachId,
                sport: r.sport || 'football',
                phone: r.phone || r.parentPhone || '',
                type: 'registry',
                isRegistered: false,
                status: r.status || 'active',
                paymentStatus: r.paymentStatus || 'due',
                paymentDate: r.paymentDate || null,
                skills: r.skills || { technique: 75, strength: 75, speed: 75, endurance: 75, discipline: 75 },
                originalUser: r
            };

            studentMap.set(id, item);
            if (stdName && gId) {
                nameKeys.add(key);
            }
        });

        return Array.from(studentMap.values());
    }, [allStudentsData, allUsersData, allRegistryData, isStudentUser]);

    const myTrialRequests = trialRequests || [];

    const groupStudents = React.useMemo(() => {
        const targetGId = selectedGroupId || (myGroups.length > 0 ? myGroups[0]?.id : null);
        if (!targetGId) return myStudents;
        return myStudents.filter(s => String(s.groupId) === String(targetGId));
    }, [myStudents, selectedGroupId, myGroups]);

    const {
        coachHistoryStats,
        isStatsLoading,
        statsError,
        studentAttendanceStats,
        attendanceStats
    } = useCoachAnalytics({
        myGroups,
        selectedGroupId,
        isCoach,
        isAdmin,
        groupStudents
    });

    // Derived Action Center Stats
    const pendingTrialsCount = myTrialRequests.length;
    const atRiskStudents = React.useMemo(() => {
        return myStudents.filter((s: any) => {
            const stats = studentAttendanceStats[s.id];
            return stats && stats.rate < 50;
        });
    }, [myStudents, studentAttendanceStats]);
    const orphanStudentsCount = myStudents.filter((s: any) => s.source === 'registry' && s.originalUser && !s.assignedUid).length;

    // AI Best-Fit Recommendation Engine Memos
    const allGroupsStats = React.useMemo(() => {
        const stats: Record<string, any> = {};
        myGroups.forEach(g => {
            const students = myStudents.filter(s => String(s.groupId) === String(g.id) && s.isRegistered);
            const count = students.length;
            if (count === 0) {
                stats[g.id] = { count: 0, technique: 75, strength: 75, speed: 75, endurance: 75, discipline: 75 };
                return;
            }
            const acc = { technique: 0, strength: 0, speed: 0, endurance: 0, discipline: 0 };
            students.forEach(s => {
                acc.technique += (s.skills?.technique || 0);
                acc.strength += (s.skills?.strength || 0);
                acc.speed += (s.skills?.speed || 0);
                acc.endurance += (s.skills?.endurance || 0);
                acc.discipline += (s.skills?.discipline || 0);
            });
            stats[g.id] = {
                count,
                technique: acc.technique / count,
                strength: acc.strength / count,
                speed: acc.speed / count,
                endurance: acc.endurance / count,
                discipline: acc.discipline / count
            };
        });
        return stats;
    }, [myGroups, myStudents]);

    const recommendedGroups = React.useMemo(() => {
        if (!comparingTrialId) return [];
        const trial = trialRequests.find(t => String(t.id) === String(comparingTrialId));
        if (!trial) return [];

        return myGroups
            .map(g => ({
                group: g,
                fitScore: calculateGroupFit(trial, g, allGroupsStats[g.id])
            }))
            .sort((a, b) => b.fitScore - a.fitScore)
            .filter(item => item.fitScore > 40) // Only helpful recommendations
            .slice(0, 3); // Top 3
    }, [comparingTrialId, trialRequests, myGroups, allGroupsStats]);

    // Hotkeys for Exercises
    useEffect(() => {
        const handleKeyPress = async (e: KeyboardEvent) => {
            if (mainTab !== 'exercises' || isExerciseModalOpen || isCollectionModalOpen) return;

            // Ctrl + C: Copy selected exercises
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                if (selectedExerciseIds.length > 0) {
                    setClipboardIds(selectedExerciseIds);
                }
            }

            // Ctrl + V: Move to current folder
            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                if (clipboardIds.length > 0 && selectedCollectionId !== 'all') {
                    // This function is defined below, which is fine for effects
                    handleBulkMove(clipboardIds, selectedCollectionId);
                }
            }

            // Escape: Clear selection
            if (e.key === 'Escape') {
                setSelectedExerciseIds([]);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [mainTab, selectedExerciseIds, clipboardIds, selectedCollectionId, isExerciseModalOpen, isCollectionModalOpen]);


    // Data Initialization Effect
    useEffect(() => {
        if (!isCoach && !isAdmin) {
            setLoading(false);
            return;
        }

        const q = isAdmin
            ? query(collection(db, "groups"), orderBy("name"))
            : query(
                collection(db, "groups"),
                where("coachId", "==", userProfile?.coachId)
            );

        const unsubscribeGroups = onSnapshot(q, (snapshot) => {
            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMyGroups(groups);
            setLoading(false);
        });

        const unsubscribeAllGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAllGroups(groups);
        });

        const unsubscribeTrials = onSnapshot(
            query(
                collection(db, "requests"),
                where("status", "in", ["new", "pending"])
            ),
            (snap) => {
                const trials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setTrialRequests(trials);
            }
        );

        const fetchAchievements = async () => {
            const snap = await getDocs(collection(db, "achievement_definitions"));
            setAvailableAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchAchievements();

        return () => {
            unsubscribeGroups();
            unsubscribeAllGroups();
            unsubscribeTrials();
        };
    }, [isCoach, isAdmin, userProfile?.coachId]);

    // Auto-select first group if not set or invalid
    useEffect(() => {
        if (myGroups.length > 0) {
            if (!selectedGroupId || !myGroups.some(g => g.id === selectedGroupId)) {
                setSelectedGroupId(myGroups[0].id);
            }
        }
    }, [myGroups, selectedGroupId]);

    // Group-based data sync
    useEffect(() => {
        if (!myGroups.length && !isAdmin) return;
        const groupIds = myGroups.map(g => g.id);
        const unsubscribes: (() => void)[] = [];

        // 1. Single listener for student registry
        unsubscribes.push(onSnapshot(query(collection(db, "student_registry"), limit(1000)), (snap) => {
            setAllRegistryData(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
        }));

        if (isAdmin) {
            // Admin: load all students and users
            unsubscribes.push(onSnapshot(query(collection(db, "students")), (snap) => {
                setAllStudentsData(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
            }));
            unsubscribes.push(onSnapshot(query(collection(db, "users")), (snap) => {
                setAllUsersData(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
            }));
        } else {
            // Coach: query by group IDs in batches of 10
            for (let i = 0; i < groupIds.length; i += 10) {
                const batch = groupIds.slice(i, i + 10);
                if (batch.length > 0) {
                    unsubscribes.push(onSnapshot(query(collection(db, "students"), where("groupId", "in", batch)), (snap) => {
                        const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
                        setAllStudentsData(prev => {
                            const dataIds = new Set(data.map(d => d.id));
                            return [...prev.filter(p => !dataIds.has(p.id)), ...data];
                        });
                    }));

                    unsubscribes.push(onSnapshot(query(collection(db, "users"), where("groupId", "in", batch)), (snap) => {
                        const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
                        setAllUsersData(prev => {
                            const dataIds = new Set(data.map(d => d.id));
                            return [...prev.filter(p => !dataIds.has(p.id)), ...data];
                        });
                    }));
                }
            }

            // Also query students/users assigned directly to this coachId
            if (userProfile?.coachId) {
                unsubscribes.push(onSnapshot(query(collection(db, "students"), where("coachId", "==", userProfile.coachId)), (snap) => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
                    setAllStudentsData(prev => {
                        const dataIds = new Set(data.map(d => d.id));
                        return [...prev.filter(p => !dataIds.has(p.id)), ...data];
                    });
                }));

                unsubscribes.push(onSnapshot(query(collection(db, "users"), where("coachId", "==", userProfile.coachId)), (snap) => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
                    setAllUsersData(prev => {
                        const dataIds = new Set(data.map(d => d.id));
                        return [...prev.filter(p => !dataIds.has(p.id)), ...data];
                    });
                }));
            }
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [myGroups, isAdmin, userProfile?.coachId]);

    // Recalculate stats on selection change
    useEffect(() => {
        if (!myGroups.length) return;
        const targetGroups = selectedGroupId ? myGroups.filter(g => g.id === selectedGroupId) : myGroups;
        findUpcomingTraining(targetGroups);
        const currentDay = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date().getDay()];
        setTodayWorkouts(targetGroups.flatMap(g => (g.schedule || []).filter((s: any) => s.day === currentDay)));

        const unsubExercises = onSnapshot(collection(db, "exercises"), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setExercises(data);
            setTotalExercisesCount(data.length);
        });
        const unsubTemplates = onSnapshot(collection(db, "training_templates"), (snap) => {
            setTrainingTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubCollections = onSnapshot(collection(db, "exercise_collections"), (snap) => {
            setExerciseCollections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen for pending submissions requiring review
        const qPendingSub = query(collection(db, "homework_submissions"), where("status", "==", "pending_review"));
        const unsubPendingSub = onSnapshot(qPendingSub, (snap) => {
            setPendingSubmissionsCount(snap.size);
        }, (err) => {
            console.warn('Error counting pending submissions:', err);
        });

        const targetGId = selectedGroupId || myGroups[0]?.id;
        let unsubTrainingPlan = () => {};
        let unsubHomework = () => {};

        let latestPlanTasks: any[] = [];
        let latestHwTasks: any[] = [];

        const updateMergedTasks = () => {
            const map = new Map<string, any>();
            latestHwTasks.forEach(t => {
                map.set(t.id, t);
                if (t.planId) map.set(t.planId, t);
            });
            latestPlanTasks.forEach(t => {
                if (!map.has(t.id) && (!t.planId || !map.has(t.planId))) {
                    map.set(t.id, t);
                }
            });
            const merged = Array.from(map.values());
            if (merged.length > 0) {
                setHomeworkTasks(merged);
            } else {
                const targetGroup = myGroups.find(g => g.id === targetGId);
                if (targetGroup?.weeklyChallengeTitle) {
                    setHomeworkTasks([{
                        id: 'group_weekly_' + targetGId,
                        title: targetGroup.weeklyChallengeTitle,
                        rewardXp: targetGroup.weeklyChallengeReward || 30,
                        rewardCoins: 30,
                        description: 'Групповой челлендж'
                    }]);
                } else {
                    setHomeworkTasks([]);
                }
            }
        };

        if (targetGId) {
            const qPlan = query(collection(db, "trainingPlan"), where("groupId", "==", targetGId));
            unsubTrainingPlan = onSnapshot(qPlan, (snap) => {
                latestPlanTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                updateMergedTasks();
            }, (err) => {
                console.warn('Error loading trainingPlan tasks:', err);
            });

            const qHw = query(collection(db, "homework"), where("groupId", "==", targetGId));
            unsubHomework = onSnapshot(qHw, (snap) => {
                latestHwTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                updateMergedTasks();
            }, (err) => {
                console.warn('Error loading homework tasks:', err);
            });
        }

        return () => { unsubExercises(); unsubTemplates(); unsubCollections(); unsubPendingSub(); unsubTrainingPlan(); unsubHomework(); };
    }, [selectedGroupId, myGroups]);

    // AI Match Utilities (Hoisted using function declaration)
    function findUpcomingTraining(groups: any[]) {
        if (!groups || groups.length === 0) {
            setUpcomingTraining(null);
            return;
        }

        const now = new Date();
        const currentDayIndex = now.getDay();
        const dayMap: Record<string, number> = {
            'Вс': 0, 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6
        };

        let nextSession: any = null;
        let minDiff = Infinity;

        groups.forEach(group => {
            if (!group.schedule) return;
            group.schedule.forEach((session: any) => {
                const dayIndex = dayMap[session.day];
                if (dayIndex === undefined) return;

                let daysDiff = dayIndex - currentDayIndex;
                if (daysDiff < 0) daysDiff += 7;

                const timeStr = session.time || '00:00';
                const [hours, minutes] = timeStr.split(':').map(Number);
                const sessionTime = new Date(now);
                sessionTime.setDate(now.getDate() + daysDiff);
                sessionTime.setHours(hours || 0, minutes || 0, 0, 0);

                const timeDiff = sessionTime.getTime() - now.getTime();
                if (timeDiff > 0 && timeDiff < minDiff) {
                    minDiff = timeDiff;
                    nextSession = {
                        groupName: group.name,
                        time: session.time,
                        day: session.day,
                        timestamp: sessionTime
                    };
                }
            });
        });

        // Fallback for same-day past sessions to next week
        if (!nextSession && groups.some(g => g.schedule?.length > 0)) {
            const firstGroup = groups.find(g => g.schedule?.length > 0);
            const s = firstGroup.schedule[0];
            nextSession = { groupName: firstGroup.name, time: s.time, day: s.day };
        }

        setUpcomingTraining(nextSession);
    };

    function calculateGroupFit(request: any, group: any, groupStats?: any) {
        if (!request || !group) return 0;
        let score = 0;
        const currentYear = new Date().getFullYear();

        // 1. Age Match (40%)
        const studentAge = request.childAge ||
            request.age ||
            (request.childBirthYear ? (currentYear - request.childBirthYear) :
                (request.birthYear ? (currentYear - request.birthYear) : 0));

        const ageMatch = group.name.match(/\d+/);
        if (ageMatch && studentAge > 0) {
            const groupAge = parseInt(ageMatch[0]);
            const diff = Math.abs(studentAge - groupAge);
            if (diff === 0) score += 40;
            else if (diff === 1) score += 30;
            else if (diff === 2) score += 15;
            else score += 5;
        } else { score += 20; }

        // 2. Schedule Match (20%)
        const preferredDays = request.preferredSchedule?.days || (request.preferredDay ? [request.preferredDay] : []);
        const groupDays = group.schedule?.map((s: any) => s.day) || [];
        if (preferredDays.length > 0) {
            const commonDays = preferredDays.filter((d: string) => groupDays.includes(d));
            score += (commonDays.length / preferredDays.length) * 20;
        } else { score += 10; }

        // 3. Skills Match (40%)
        const evalData = trialEvaluations[request.id];
        if (evalData && groupStats && groupStats.count > 0) {
            // Calculate similarity across the 5 metrics
            const metrics = ['technique', 'strength', 'speed', 'endurance', 'discipline'];
            let similaritySum = 0;
            metrics.forEach(m => {
                const studentVal = evalData[m] || 50;
                const groupVal = groupStats[m] || 75;
                const diff = Math.abs(studentVal - groupVal);
                // 100% similarity if diff is 0, 0% if diff is 100
                similaritySum += (100 - diff);
            });
            score += (similaritySum / (metrics.length * 100)) * 40;
        } else {
            // Fallback to text experience level match
            const exp = request.experienceLevel || request.level;
            if (exp === 'pro' && (group.name.toLowerCase().includes('pro') || group.level === 'pro')) score += 40;
            else if ((exp === 'newbie' || exp === 'beginner') && (group.name.toLowerCase().includes('begin') || group.level === 'beginner')) score += 40;
            else score += 20;
        }

        return Math.min(Math.round(score), 100);
    };

    const handleSelectExerciseForAssignment = (exId: string) => {
        setSelectedExerciseId(exId);
        if (!exId) return;
        const found = exercises.find(e => e.id === exId);
        if (found) {
            setAssignmentTitle(found.title || '');
            if (found.description) setAssignmentDescription(found.description);
            if (found.rewardXp) setAssignmentRewardXp(found.rewardXp);
        }
    };

    const handleOpenAssignmentModal = (item: any, type: 'exercise' | 'program') => {
        setAssigningItem({ ...item, itemType: type });
        setAssignmentTitle(item?.title || '');
        setAssignmentDescription(item?.description || '');
        setAssignmentRewardXp(item?.rewardXp || 30);
        setSelectedExerciseId(type === 'exercise' ? item?.id : '');
        setAssignmentTargetType('group');
        setSelectedAssignmentTarget(selectedGroupId || (myGroups[0]?.id) || null);
        setIsAssignmentModalOpen(true);
    };

    const handleOpenGroupAssignment = () => {
        setEditingAssignmentTask(null);
        setAssigningItem({
            title: '',
            description: '',
            itemType: 'group_challenge'
        });
        setAssignmentTitle('');
        setAssignmentDescription('');
        setAssignmentRewardXp(30);
        setAssignmentTargetType('group');
        setSelectedAssignmentTarget(selectedGroupId || (myGroups[0]?.id) || null);
        setSelectedExerciseId('');
        setIsAssignmentModalOpen(true);
    };

    const handleAssignPersonalTask = (student: any) => {
        setEditingAssignmentTask(null);
        setAssigningItem({
            title: '',
            description: '',
            itemType: 'personal',
            targetStudent: student
        });
        setAssignmentTitle(`Задание: ${student.name}`);
        setAssignmentDescription('');
        setAssignmentRewardXp(30);
        setAssignmentTargetType('student');
        setSelectedAssignmentTarget(student.groupId || selectedGroupId || (myGroups[0]?.id) || null);
        setAssignmentTargetStudentId(student.id);
        setSelectedExerciseId('');
        setIsAssignmentModalOpen(true);
    };

    const handleOpenEditAssignment = React.useCallback((task: any) => {
        setEditingAssignmentTask(task);
        setIsAssignmentModalOpen(true);
    }, []);

    const handleDeleteAssignment = React.useCallback(async (task: any) => {
        setHomeworkTasks(prev => prev.filter(t => t.id !== task.id));
    }, []);

    const handleAIGenerateExercise = async () => {
        if (!newExerciseData.title || newExerciseData.title.trim() === '') return;

        setIsGeneratingAI(true);
        // Simulate intelligent analysis / Gemini Call
        await new Promise(resolve => setTimeout(resolve, 1500));

        const title = newExerciseData.title.toLowerCase();
        let suggestedDescription = `Техническое упражнение направленное на развитие навыков ${newExerciseData.title}. Выполняется в высоком темпе с акцентом на правильную биомеханику.`;
        let suggestedMuscles: string[] = [];
        let suggestedLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
        let suggestedCategory = 'technique';

        if (title.includes('прыжок') || title.includes('jump') || title.includes('плио')) {
            suggestedDescription = "Взрывное плиометрическое упражнение. Развивает стартовую скорость и мощность ног. Следите за приземлением на носок.";
            suggestedMuscles = ['quads', 'calves', 'glutes'];
            suggestedLevel = 'intermediate';
            suggestedCategory = 'strength';
        } else if (title.includes('дриблинг') || title.includes('мяч') || title.includes('ball')) {
            suggestedDescription = "Развитие мелкой моторики и чувства мяча. Требует максимальной концентрации и частоты касаний.";
            suggestedMuscles = ['quads', 'calves', 'core'];
            suggestedLevel = 'beginner';
            suggestedCategory = 'technique';
        } else if (title.includes('планка') || title.includes('кор') || title.includes('core')) {
            suggestedDescription = "Стабилизация позвоночника и укрепление мышц пресса. Держите спину прямой, не допускайте прогибов.";
            suggestedMuscles = ['core', 'shoulders'];
            suggestedLevel = 'beginner';
            suggestedCategory = 'strength';
        } else if (title.includes('спринт') || title.includes('скорост') || title.includes('speed')) {
            suggestedDescription = "Максимальное ускорение на короткую дистанцию. Работа над частотой шага и мощностью отталкивания.";
            suggestedMuscles = ['quads', 'hamstrings', 'calves'];
            suggestedLevel = 'advanced';
            suggestedCategory = 'speed';
        } else if (title.includes('растяжк') || title.includes('йога') || title.includes('stretching')) {
            suggestedDescription = "Упражнение на увеличение амплитуды движений. Дышите ровно, не делайте резких движений.";
            suggestedMuscles = ['fullbody'];
            suggestedLevel = 'beginner';
            suggestedCategory = 'flexibility';
        }

        setNewExerciseData({
            ...newExerciseData,
            description: suggestedDescription,
            muscles: suggestedMuscles.length > 0 ? suggestedMuscles : ['fullbody'],
            level: suggestedLevel,
            category: suggestedCategory
        });
        setIsGeneratingAI(false);
    };

    const handleSmartAutoSort = async () => {
        if (exercises.length === 0) return;
        setIsSmartSorted(true);

        // Stage 1: Scanning
        setSortingStatus('scanning');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Stage 2: Linking
        setSortingStatus('linking');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const updatedExercises = exercises.map(ex => {
            const content = (ex.title + ' ' + ex.description).toLowerCase();
            let autoColId = ex.collectionId;

            if (autoColId === 'all') {
                if (content.includes('дриблинг') || content.includes('техника')) {
                    const col = exerciseCollections.find(c => c.title.toLowerCase().includes('техника'));
                    if (col) autoColId = col.id;
                } else if (content.includes('сила') || content.includes('пресс') || content.includes('мышцы')) {
                    const col = exerciseCollections.find(c => c.title.toLowerCase().includes('сила'));
                    if (col) autoColId = col.id;
                } else if (content.includes('юниор') || content.includes('junior') || content.includes('u10')) {
                    const col = exerciseCollections.find(c => c.title.toLowerCase().includes('юниор') || c.title.toLowerCase().includes('млад'));
                    if (col) autoColId = col.id;
                }
            }

            return { ...ex, collectionId: autoColId };
        });

        // Stage 3: Cleaning
        setSortingStatus('cleaning');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update in state
        setExercises(updatedExercises);

        // Persist to Firebase
        for (const ex of updatedExercises) {
            if (ex.id && ex.id.length > 5 && !ex.id.startsWith('default-')) {
                const exerciseRef = doc(db, 'exercises', ex.id);
                await updateDoc(exerciseRef, { collectionId: ex.collectionId });
            }
        }

        // Stage 4: Done
        setSortingStatus('done');
        setTimeout(() => {
            setIsSmartSorted(false);
            setSortingStatus('idle');
        }, 3000);
    };

    const handleViewStudentProfile = async (student: any) => {
        setStudentProfileLoading(true);
        setSelectedStudentForProfile(student);
        setIsProfileModalOpen(true);
        try {
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);

            const q = query(
                collection(db, "attendance"),
                where("groupId", "==", selectedGroupId)
            );

            const snap = await getDocs(q);
            const records = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

            const presentCount = records.filter(r => {
                const rec = r.records?.[student.id];
                const status = typeof rec === 'string' ? rec : rec?.status;
                return status === 'present';
            }).length;

            setStudentProfileStats({
                present: presentCount,
                absent: records.length - presentCount,
                total: records.length,
                rate: records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0
            });

            setStudentActivityLog(records.slice(0, 5).map(r => ({
                id: r.id,
                type: 'grade',
                date: r.date,
                grade: r.grades?.[student.id] || null
            })));

        } catch (err) {
            console.error("Error loading student profile:", err);
        }
        setStudentProfileLoading(false);
    };

    // Remvoved handleContactParentWhatsApp as we use native chat now

    const handleSaveEvaluation = async () => {
        if (!selectedTrialForEval) return;
        setIsSavingEvaluation(true);
        try {
            const avg = Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5;
            const level = avg > 80 ? 'Gold' : avg > 50 ? 'Silver' : 'Bronze';

            const evalData = {
                skills: currentEvalSkills,
                tags: selectedEvalTags,
                comment: coachEvalComment,
                level,
                coachId: user?.uid,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, "requests", selectedTrialForEval.id), {
                evaluation: evalData
            });

            setTrialEvaluations(prev => ({
                ...prev,
                [selectedTrialForEval.id]: evalData
            }));
            setIsEvaluationModalOpen(false);
        } catch (err) {
            console.error("Error saving evaluation:", err);
            alert("Ошибка при сохранении оценки.");
        } finally {
            setIsSavingEvaluation(false);
        }
    };

    const handleEvalAndEnroll = async (groupId: string) => {
        if (!selectedTrialForEval) return;
        setIsSavingEvaluation(true);
        try {
            const avg = Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5;
            const level = avg > 80 ? 'Gold' : avg > 50 ? 'Silver' : 'Bronze';

            const evalData = {
                skills: currentEvalSkills,
                tags: selectedEvalTags,
                comment: coachEvalComment,
                level,
                coachId: user?.uid,
                updatedAt: serverTimestamp()
            };

            const batch = writeBatch(db);
            const studentId = doc(collection(db, "students")).id;
            const targetGroup = allGroups.find(g => g.id === groupId);
            const targetCoachId = targetGroup?.coachId || userProfile.coachId;

            // 1. Save evaluation and status to request
            const requestRef = doc(db, "requests", selectedTrialForEval.id);
            batch.update(requestRef, {
                evaluation: evalData,
                status: 'enrolled',
                enrolledAt: serverTimestamp(),
                assignedGroupId: groupId,
                assignedCoachId: targetCoachId
            });

            // 2. Create student document
            const studentRef = doc(db, "students", studentId);
            batch.set(studentRef, {
                name: `${selectedTrialForEval.childSurname} ${selectedTrialForEval.childName}`,
                phone: selectedTrialForEval.phone || selectedTrialForEval.parentPhone || '',
                groupId: groupId,
                coachId: targetCoachId,
                type: 'trial',
                status: 'active',
                createdAt: serverTimestamp(),
                trialRequestId: selectedTrialForEval.id,
                evaluation: evalData
            });

            await batch.commit();

            setTrialEvaluations(prev => ({
                ...prev,
                [selectedTrialForEval.id]: evalData
            }));
            setIsEvaluationModalOpen(false);
        } catch (err) {
            console.error("Error in combined flow:", err);
            alert("Ошибка при зачислении.");
        } finally {
            setIsSavingEvaluation(false);
        }
    };

    const handleStartComparison = (trial: any) => {
        setComparingTrialId(trial.id);
        setMainTab('stats');
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTogglePayment = async (studentId: string, currentStatus: string) => {
        try {
            const nextStatus = currentStatus === 'paid' ? 'due' : 'paid';
            const student = myStudents.find(s => s.id === studentId);
            const targetCollection = student?.isRegistered ? 'users' : 'students';
            const studentRef = doc(db, targetCollection, studentId);
            await updateDoc(studentRef, {
                paymentStatus: nextStatus,
                paymentDate: nextStatus === 'paid' ? new Date().toISOString() : null
            });
            setAllStudentsData(prev => prev.map(s => s.id === studentId ? { ...s, paymentStatus: nextStatus } : s));
        } catch (e) {
            console.error("Error toggling payment status:", e);
        }
    };

    const handleDeleteTrialRequest = async (id: string) => {
        try {
            await deleteDoc(doc(db, "requests", id));
        } catch (err) {
            console.error("Error deleting request:", err);
            alert("Ошибка при удалении заявки.");
        }
    };

    const handleViewTrialRequest = (request: any) => {
        setSelectedRequestForDetails(request);
        setIsRequestDetailsModalOpen(true);
    };

    const handleEnrollTrial = async (groupId: string) => {
        if (!selectedTrialRequest) return;
        setIsEnrolling(true);
        try {
            const batch = writeBatch(db);
            const studentId = doc(collection(db, "students")).id;

            // Find target group to get its coachId
            const targetGroup = allGroups.find(g => g.id === groupId);
            const targetCoachId = targetGroup?.coachId || userProfile.coachId;

            // 1. Create student document
            const studentRef = doc(db, "students", studentId);
            batch.set(studentRef, {
                name: selectedTrialRequest.name || selectedTrialRequest.childName || 'Новый ученик',
                phone: selectedTrialRequest.phone || selectedTrialRequest.parentPhone || '',
                email: selectedTrialRequest.email || '',
                groupId: groupId,
                coachId: targetCoachId,
                type: 'trial',
                status: 'active',
                createdAt: serverTimestamp(),
                trialRequestId: selectedTrialRequest.id,
                experienceLevel: selectedTrialRequest.experienceLevel || 'beginner',
                birthYear: selectedTrialRequest.birthYear || selectedTrialRequest.childBirthYear || null,
                preferredSchedule: selectedTrialRequest.preferredSchedule || null
            });

            // 2. Mark request as enrolled
            const requestRef = doc(db, "requests", selectedTrialRequest.id);
            batch.update(requestRef, {
                status: 'enrolled',
                enrolledAt: serverTimestamp(),
                assignedGroupId: groupId,
                assignedCoachId: targetCoachId
            });

            // 3. Initialize/Join Chats Automatically
            const parentUid = selectedTrialRequest.userId || selectedTrialRequest.assignedUid;
            const parentName = selectedTrialRequest.name || selectedTrialRequest.childName || 'Родитель';

            if (parentUid && typeof parentUid === 'string') {
                // Initialize private chat
                const chatId = [targetCoachId, parentUid].sort().join('_');
                const chatRef = doc(db, "private_chats", chatId);

                const coachName = userProfile?.name || 'Тренер';
                const finalParentName = parentName || 'Родитель';

                batch.set(chatRef, {
                    participants: [targetCoachId, parentUid],
                    participantNames: {
                        [targetCoachId]: coachName,
                        [parentUid]: finalParentName
                    },
                    lastMessage: `Здравствуйте! Заявка одобрена. Ваш ребенок зачислен в группу "${targetGroup?.name || 'Sparta'}".`,
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    unreadCount: {
                        [parentUid]: 1,
                        [targetCoachId]: 0
                    }
                }, { merge: true });

                const msgRef = doc(collection(chatRef, "messages"));
                batch.set(msgRef, {
                    text: `Здравствуйте! Заявка одобрена. Ваш ребенок зачислен в группу "${targetGroup?.name || 'Sparta'}".`,
                    senderId: targetCoachId,
                    createdAt: serverTimestamp(),
                    type: 'system'
                });

                // Join Group Chat if it exists
                const groupChatId = targetGroup?.chatId || groupId;
                const groupChatRef = doc(db, "group_chats", groupChatId);
                batch.update(groupChatRef, {
                    participants: arrayUnion(parentUid),
                    [`participantNames.${parentUid}`]: parentName
                });
            }

            await batch.commit();
            setIsEnrollModalOpen(false);

            // Auto-redirect to messages to start coordinating
            if (parentUid) {
                const targetName = parentName;
                window.history.pushState({}, '', `?tab=messages_unified&targetUid=${parentUid}&targetName=${encodeURIComponent(targetName)}`);
                // If we are in the dashboard, we should trigger a tab change
                // Dashboard.tsx respects URL params for activeTab initialization
                window.location.reload(); // Hard reload or state change if possible
            } else {
                setSelectedTrialRequest(null);
            }
        } catch (err) {
            console.error("Error enrolling trial:", err);
        }
        setIsEnrolling(false);
    };

    const handleUpdateChat = async () => {
        if (!editingChat || !editingChat.id) return;
        try {
            await updateDoc(doc(db, "group_chats", editingChat.id), {
                title: editingChat.title,
                description: editingChat.description,
                updatedAt: serverTimestamp()
            });
            setIsManageChatOpen(false);
        } catch (err) {
            console.error("Error updating chat:", err);
        }
    };

    const handleContactParent = (person: any) => {
        if (!person) return;

        // 1. Identify parent account UID
        const parentUid = person.parentId ||
            person.parentUid ||
            person.originalUser?.parentId ||
            person.originalUser?.parentUid ||
            (person.role === 'parent' ? (person.uid || person.id) : null);

        // 2. Identify parent display name
        const parentName = person.parentName ||
            person.parentDisplayName ||
            person.originalUser?.parentName ||
            person.originalUser?.displayName ||
            'Родитель';

        // 3. Identify student name
        const studentName = person.childName ||
            person.childFirstName ||
            person.name ||
            'Спортсмен';

        // 4. Identify parent phone for WhatsApp fallback
        const phone = person.parentPhone ||
            person.phone ||
            person.originalUser?.parentPhone ||
            person.originalUser?.phone ||
            '';
        const cleanPhone = String(phone).replace(/\D/g, '');

        if (parentUid && parentUid.length > 5) {
            // Valid parent account in system: redirect to unified messenger with parent
            navigate(`?tab=messages_unified&targetUid=${parentUid}&targetName=${encodeURIComponent(parentName)}&studentName=${encodeURIComponent(studentName)}`);
        } else if (cleanPhone && cleanPhone.length >= 10) {
            // No parent account in system: open WhatsApp
            const formattedPhone = cleanPhone.startsWith('8') && cleanPhone.length === 11
                ? '7' + cleanPhone.slice(1)
                : cleanPhone;
            window.open(`https://wa.me/${formattedPhone}`, '_blank');
        } else {
            // Fallback to unified messenger
            navigate('?tab=messages_unified');
        }
    };

    const handleTransferStudent = async (groupId: string) => {
        if (!studentToTransfer) return;
        setIsTransferring(true);
        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, "students", studentToTransfer.id);

            // Find target group to get its coachId
            const targetGroup = allGroups.find(g => g.id === groupId);
            const targetCoachId = targetGroup?.coachId || userProfile.coachId;
            const targetCoachName = targetGroup?.coachName || targetGroup?.coach || 'Не указан';

            // Add to new notifications collection
            const notifRef = doc(collection(db, "notifications"));
            batch.set(notifRef, {
                userId: studentToTransfer.id,
                title: "Перевод в новую группу",
                message: `Вас перевели в новую группу: ${targetGroup?.name || 'неизвестно'}. Ваш тренер: ${targetCoachName}`,
                type: 'transfer',
                createdAt: serverTimestamp(),
                read: false
            });

            // Update student group and coach info
            batch.update(studentRef, {
                groupId: groupId,
                coachId: targetCoachId,
                updatedAt: serverTimestamp()
            });

            // If it's a registered user, we might also want to update their profile (optional but good consistency)
            if (studentToTransfer.type === 'real') {
                const userRef = doc(db, "users", studentToTransfer.id);
                batch.update(userRef, {
                    groupId: groupId,
                    coachId: targetCoachId
                });
            }
            await batch.commit();
            setIsTransferring(false);
            setIsTransferModalOpen(false);
            setStudentToTransfer(null);
        } catch (err) {
            console.error("Error transferring student:", err);
            setIsTransferring(false);
        }
    };

    const handleSaveExercise = async () => {
        if (!newExerciseData.title.trim()) {
            alert("Ученик успешно переведен");
            return;
        }

        // Validation: If not URL mode, must have files (unless editing and already has items)
        if (newExerciseData.mediaType !== 'url' && newExerciseData.mediaItems.length === 0) {
            alert("Пожалуйста, предоставьте правильную ссылку на YouTube.");
            return;
        }

        setIsSavingExercise(true);
        setUploadProgress(0);

        try {
            const itemsToUpload = newExerciseData.mediaItems.filter(item => item.file);
            const totalFiles = itemsToUpload.length;
            let uploadCount = 0;

            const processedMediaItems: any[] = [];

            // 1. Process existing items and new uploads
            for (const item of newExerciseData.mediaItems) {
                if (item.file) {
                    const fileExt = item.file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                    const filePath = `exercises/${userProfile.coachId}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('exercises-media')
                        .upload(filePath, item.file, { cacheControl: '3600', upsert: false });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('exercises-media')
                        .getPublicUrl(filePath);

                    processedMediaItems.push({
                        url: publicUrl,
                        type: item.file.type.startsWith('video/') ? 'video' : 'photo'
                    });

                    uploadCount++;
                    setUploadProgress(Math.round((uploadCount / totalFiles) * 100));
                } else {
                    // It's a remote URL or existing item
                    processedMediaItems.push({ url: item.url, type: item.type });
                }
            }

            // 2. Add YouTube URL if in 'url' mode
            if (newExerciseData.mediaType === 'url' && newExerciseData.videoUrl.trim()) {
                processedMediaItems.unshift({
                    url: newExerciseData.videoUrl.trim(),
                    type: 'url'
                });
            }

            if (!userProfile?.coachId) {
                throw new Error("ID тренера не найден. Пожалуйста, обновите страницу.");
            }

            const finalMediaType = processedMediaItems.length > 0 ? processedMediaItems[0].type : 'url';

            const exerciseData: any = {
                title: newExerciseData.title.trim(),
                description: newExerciseData.description.trim(),
                category: newExerciseData.category,
                level: newExerciseData.level,
                equipment: newExerciseData.equipment,
                muscles: newExerciseData.muscles || [],
                collectionId: newExerciseData.collectionId || 'all',
                mediaType: finalMediaType,
                mediaUrl: processedMediaItems.length > 0 ? processedMediaItems[0].url : '',
                mediaItems: processedMediaItems,
                usageCount: newExerciseData.usageCount || 0,
                coachId: userProfile.coachId,
                coachName: userProfile.name || 'Тренер',
                updatedAt: serverTimestamp()
            };

            if (editingExercise) {
                await updateDoc(doc(db, 'exercises', editingExercise.id), exerciseData);
            } else {
                exerciseData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'exercises'), exerciseData);
            }

            setIsExerciseModalOpen(false);
            setEditingExercise(null);
            setNewExerciseData({
                title: '', description: '', category: 'technique',
                level: 'beginner', equipment: [], muscles: [], usageCount: 0, collectionId: 'all',
                videoUrl: '', mediaType: 'url', mediaItems: []
            });
        } catch (err: any) {
            console.error("Error saving exercise:", err);
            alert(`Ошибка при сохранении: ${err.message || 'Неизвестная ошибка'}`);
        } finally {
            setIsSavingExercise(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteExercise = async (id: string, mediaItems: any[]) => {
        if (!window.confirm("Вы уверены, что хотите удалить это упражнение? Это автономном режиме.")) return;

        try {
            await deleteDoc(doc(db, "exercises", id));

            if (mediaItems && mediaItems.length > 0) {
                const paths = mediaItems
                    .filter(item => item.type !== 'url')
                    .map(item => {
                        const parts = item.url.split('/');
                        return `exercises/${userProfile.coachId}/${parts[parts.length - 1]}`;
                    });

                if (paths.length > 0) {
                    await supabase.storage.from('exercises-media').remove(paths);
                }
            }
        } catch (err) {
            console.error("Error deleting exercise:", err);
            alert("Ошибка при удалении упражнения.");
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm("Вы уверены, что хотите удалить эту программу? Это действие необратимо.")) return;
        try {
            await deleteDoc(doc(db, "training_templates", id));
        } catch (err) {
            console.error("Error deleting template:", err);
            alert("Ошибка при удалении программы.");
        }
    };

    const handleOpenEditTemplateModal = (template: any) => {
        setEditingTemplate(template);
        setNewTemplateData({
            title: template.title,
            description: template.description || '',
            intensity: template.intensity || 'medium',
            duration: template.duration || '4',
            category: template.category || 'technique',
            stages: template.stages || {
                warmup: [],
                main: template.exercises || [],
                skills: [],
                cooldown: []
            },
            coverImage: template.coverImage || '',
            gallery: template.gallery || [],
            intensityCurve: template.intensityCurve || [30, 50, 80, 45]
        });
        setSelectedExercisesForTemplate(template.exercises || []);
        setIsTemplateModalOpen(true);
    };

    const handleDuplicateTemplate = (template: any) => {
        setEditingTemplate(null); // Important: reset to null so it saves as new
        setNewTemplateData({
            title: `Копия - ${template.title}`,
            description: template.description || '',
            intensity: template.intensity || 'medium',
            duration: template.duration || '4',
            category: template.category || 'technique',
            stages: JSON.parse(JSON.stringify(template.stages)) || {
                warmup: [],
                main: template.exercises || [],
                skills: [],
                cooldown: []
            },
            coverImage: template.coverImage || '',
            gallery: template.gallery ? [...template.gallery] : [],
            intensityCurve: template.intensityCurve || [30, 50, 80, 45]
        });
        setSelectedExercisesForTemplate(template.exercises || []);
        setIsTemplateModalOpen(true);
    };

    const handleOpenTemplateLightbox = (initialUrl: string) => {
        const allMedia: Array<{ url: string, type: 'video' | 'photo' | 'url' }> = [];

        // Add cover if it exists
        if (newTemplateData.coverImage) {
            allMedia.push({ url: newTemplateData.coverImage, type: 'photo' });
        }

        // Add gallery items
        newTemplateData.gallery.forEach(url => {
            // Check if it's already added (if cover is from gallery)
            if (!allMedia.some(m => m.url === url)) {
                allMedia.push({ url, type: 'photo' });
            }
        });

        if (allMedia.length === 0) return;

        const currentIndex = allMedia.findIndex(m => m.url === initialUrl);
        setSelectedMediaForLightbox({
            items: allMedia,
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
            title: newTemplateData.title || 'Предпросмотр'
        });
    };


    const handleTemplateMediaFiles = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        setIsUploadingCover(true);
        const uploadedUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${i}.${fileExt}`;
                const filePath = `program_covers/${user?.uid || 'temp'}/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('exercises-media')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('exercises-media')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            setNewTemplateData(prev => {
                const newGallery = [...prev.gallery, ...uploadedUrls];
                let newCover = prev.coverImage;

                // If there's no cover image yet or if it was a manual URL that might be replaced, 
                // we set the new uploaded one as cover if it's the first one
                if ((!newCover || !newCover.includes('supabase')) && uploadedUrls.length > 0) {
                    newCover = uploadedUrls[0];
                }

                return {
                    ...prev,
                    coverImage: newCover,
                    gallery: newGallery
                };
            });

            // Hide URL input after device upload to keep UI clean
            setShowTemplateUrlInput(false);
            setIsUploadingCover(false);
            setIsDraggingToTemplate(false);
        } catch (error) {
            console.error('Upload failed:', error);
            setIsUploadingCover(false);
            setIsDraggingToTemplate(false);
        }
    };

    const handleRemoveGalleryImage = (url: string) => {
        setNewTemplateData(prev => ({
            ...prev,
            gallery: prev.gallery.filter(item => item !== url),
            coverImage: prev.coverImage === url ? (prev.gallery.filter(item => item !== url)[0] || '') : prev.coverImage
        }));
    };

    const handleOpenEditModal = (ex: any) => {
        setEditingExercise(ex);

        let initialItems = [];
        if (ex.mediaItems && ex.mediaItems.length > 0) {
            initialItems = ex.mediaItems.map((item: any, idx: number) => ({
                id: `existing-${idx}-${Date.now()}`,
                url: item.url,
                type: item.type,
                angle: item.angle || ''
            }));
        } else if (ex.mediaUrl) {
            // Fallback for legacy exercises
            initialItems = [{
                id: `legacy-${Date.now()}`,
                url: ex.mediaUrl,
                type: ex.mediaType || 'video'
            }];
        }

        setNewExerciseData({
            title: ex.title,
            description: ex.description || '',
            category: ex.category || 'technique',
            level: ex.level || 'beginner',
            equipment: ex.equipment || [],
            muscles: ex.muscles || [],
            collectionId: ex.collectionId || 'all',
            videoUrl: ex.mediaType === 'url' ? ex.mediaUrl : '',
            mediaType: ex.mediaType || (initialItems.length > 0 ? (initialItems[0].type === 'video' ? 'video' : 'photo') : 'url'),
            usageCount: ex.usageCount || 0,
            mediaItems: initialItems
        });
        setIsExerciseModalOpen(true);
    };

    const handleOpenCopyModal = (ex: any) => {
        setEditingExercise(null);

        let initialItems = [];
        if (ex.mediaItems && ex.mediaItems.length > 0) {
            initialItems = ex.mediaItems.map((item: any, idx: number) => ({
                id: `copy-${idx}-${Date.now()}`,
                url: item.url,
                type: item.type,
                angle: item.angle || ''
            }));
        } else if (ex.mediaUrl) {
            initialItems = [{
                id: `copy-legacy-${Date.now()}`,
                url: ex.mediaUrl,
                type: ex.mediaType || 'video'
            }];
        }

        setNewExerciseData({
            title: `${ex.title} (Копия)`,
            description: ex.description || '',
            category: ex.category || 'technique',
            level: ex.level || 'beginner',
            equipment: ex.equipment || [],
            muscles: ex.muscles || [],
            collectionId: ex.collectionId || 'all',
            videoUrl: ex.mediaType === 'url' ? ex.mediaUrl : '',
            mediaType: ex.mediaType || (initialItems.length > 0 ? (initialItems[0].type === 'video' ? 'video' : 'photo') : 'url'),
            usageCount: 0,
            mediaItems: initialItems
        });
        setIsExerciseModalOpen(true);
    };

    const handleRemoveMediaItem = (id: string) => {
        setNewExerciseData(prev => ({
            ...prev,
            mediaItems: prev.mediaItems.filter(item => item.id !== id)
        }));
    };

    const handleAddDefaultExercises = async () => {
        if (!userProfile?.coachId) return;
        setIsSavingExercise(true);
        try {
            const batch = writeBatch(db);
            DEFAULT_EXERCISES.forEach(ex => {
                const newDocRef = doc(collection(db, "exercises"));
                batch.set(newDocRef, {
                    ...ex,
                    coachId: userProfile.coachId,
                    coachName: userProfile.name || 'Тренер',
                    collectionId: 'all',
                    mediaItems: [{ url: ex.mediaUrl, type: 'url' }],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });
            await batch.commit();
            // notification or success state here
        } catch (err) {
            console.error("Error adding defaults:", err);
            alert("Ошибка при сохранении");
        }
        setIsSavingExercise(false);
    };

    const handleMoveExercise = async (exId: string, colId: string) => {
        try {
            await updateDoc(doc(db, "exercises", exId), {
                collectionId: colId,
                updatedAt: serverTimestamp()
            });
            setMovingExerciseId(null);
            // Also update selected list if it's there
            setSelectedExerciseIds(prev => prev.filter(id => id !== exId));
        } catch (err) {
            console.error("Error moving exercise:", err);
            alert("Ошибка при перемещении");
        }
    };

    const handleBulkMove = async (ids: string[], colId: string) => {
        if (!ids.length || colId === 'all') return;
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.update(doc(db, "exercises", id), {
                    collectionId: colId,
                    updatedAt: serverTimestamp()
                });
            });
            await batch.commit();
            setSelectedExerciseIds([]);
            setClipboardIds([]);
        } catch (err) {
            console.error("Error in bulk move:", err);
            alert("Ошибка при массовом перемещении");
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        if (!ids.length) return;
        if (!confirm(`Удалить выбранные упражнения (${ids.length})?`)) return;
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.delete(doc(db, "exercises", id));
            });
            await batch.commit();
            setSelectedExerciseIds([]);
        } catch (err) {
            console.error("Error in bulk delete:", err);
            alert("Ошибка при массовом удалении");
        }
    };

    const handleSaveCollection = async () => {
        if (!newCollectionData.title) return;
        try {
            if (editingCollection) {
                await updateDoc(doc(db, "exercise_collections", editingCollection.id), {
                    ...newCollectionData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "exercise_collections"), {
                    ...newCollectionData,
                    coachId: userProfile.coachId,
                    createdAt: serverTimestamp()
                });
            }
            setNewCollectionData({ title: '', color: '#D4AF37' });
            setEditingCollection(null);
            setIsCollectionModalOpen(false);
        } catch (err) {
            console.error("Error saving collection:", err);
        }
    };

    const handleDeleteCollection = async (id: string) => {
        if (!window.confirm('Удалить коллекцию? Упражнения останутся в общем доступе.')) return;
        try {
            await deleteDoc(doc(db, "exercise_collections", id));
        } catch (err) {
            console.error("Error deleting collection:", err);
        }
    };

    const handleFilesDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFiles(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const newItems = files.map((f: any) => ({
                id: `drop-${Date.now()}-${Math.random()}`,
                file: f,
                url: URL.createObjectURL(f),
                type: (f.type.startsWith('video/') ? 'video' : 'photo') as any
            }));
            setNewExerciseData(prev => ({
                ...prev,
                mediaType: newItems[0].type,
                mediaItems: [...prev.mediaItems, ...newItems]
            }));
        }
    };

    const handleSaveAssignment = async () => {
        const finalTitle = (assignmentTitle.trim() || assigningItem?.title || '').trim();
        if (!finalTitle) {
            alert('Пожалуйста, укажите название задания или выберите упражнение');
            return;
        }

        const targetGId = selectedAssignmentTarget || selectedGroupId || (myGroups[0]?.id);
        if (!targetGId) {
            alert('Пожалуйста, выберите целевую группу');
            return;
        }

        setIsSavingAssignment(true);
        try {
            const batch = writeBatch(db);
            const targetGroup = myGroups.find(g => g.id === targetGId) || allGroups.find(g => g.id === targetGId);
            const groupSport = targetGroup?.sport || 'football';
            const targetStudent = assignmentTargetType === 'student'
                ? (groupStudents.find(s => s.id === assignmentTargetStudentId) || myStudents.find(s => s.id === assignmentTargetStudentId) || assigningItem?.targetStudent)
                : null;

            const isGroupWide = assignmentTargetType === 'group';
            const studentId = isGroupWide ? null : (targetStudent?.id || targetStudent?.uid || targetStudent?.studentId || null);
            const studentUid = isGroupWide ? null : (targetStudent?.uid || targetStudent?.assignedUid || targetStudent?.id || null);
            const calculatedCoins = 30;
            const calculatedXp = Number(assignmentRewardXp) || 50;

            // 1. Prepare training data
            let trainingData: any = {
                title: finalTitle,
                description: assignmentDescription || assigningItem?.description || '',
                coins: calculatedCoins,
                rewardCoins: calculatedCoins,
                rewardXp: calculatedXp,
                deadline: assignmentDeadline || null,
                dueDate: assignmentDeadline || null,
                date: format(new Date(), 'yyyy-MM-dd'),
                groupId: targetGId,
                groupName: targetGroup?.name || targetGroup?.title || 'Группа',
                coachId: userProfile?.coachId || user?.uid || '',
                coachName: coachDisplayName || 'Тренер',
                isGroupWide: isGroupWide,
                targetType: assignmentTargetType,
                studentId: studentId,
                studentUid: studentUid,
                studentName: isGroupWide ? null : (targetStudent?.name || null),
                status: 'active',
                createdAt: serverTimestamp(),
                intensityCurve: assigningItem?.intensityCurve || null,
                coverImage: assigningItem?.coverImage || null
            };

            // 2. Structural Logic: Legacy vs Modern
            if (assigningItem?.itemType === 'program') {
                trainingData.type = 'program_assignment';
                trainingData.templateId = assigningItem.id;

                if (assigningItem.stages) {
                    trainingData.stages = assigningItem.stages;
                } else if (assigningItem.exercises) {
                    trainingData.stages = {
                        warmup: [],
                        main: assigningItem.exercises,
                        skills: [],
                        cooldown: []
                    };
                }
            } else if (assigningItem?.itemType === 'exercise' || selectedExerciseId) {
                const ex = exercises.find(e => e.id === (selectedExerciseId || assigningItem?.id));
                trainingData.type = 'library_assignment';
                trainingData.exerciseId = ex?.id || selectedExerciseId || assigningItem?.id;
                trainingData.videoUrl = ex?.videoUrl || assigningItem?.videoUrl || '';
            } else {
                trainingData.type = isGroupWide ? 'challenge' : 'personal_challenge';
            }

            // Generate one shared ID for all assignment collections to prevent duplicates
            const sharedDocId = doc(collection(db, "homework")).id;

            // 3. Create the Training Plan document
            const newPlanRef = doc(db, "trainingPlan", sharedDocId);
            batch.set(newPlanRef, { id: sharedDocId, ...trainingData });

            // 4. Create homework document
            const homeworkRef = doc(db, "homework", sharedDocId);
            const homeworkPayload = {
                id: sharedDocId,
                planId: sharedDocId,
                title: finalTitle,
                description: assignmentDescription || assigningItem?.description || '',
                rewardCoins: calculatedCoins,
                rewardXp: calculatedXp,
                dueDate: assignmentDeadline || null,
                groupId: targetGId,
                groupName: targetGroup?.name || targetGroup?.title || 'Группа',
                coachId: userProfile?.coachId || user?.uid || '',
                coachName: coachDisplayName || 'Тренер',
                isGroupWide: isGroupWide,
                targetType: assignmentTargetType,
                studentId: studentId,
                studentUid: studentUid,
                studentName: isGroupWide ? null : (targetStudent?.name || null),
                status: 'active',
                createdAt: serverTimestamp()
            };
            batch.set(homeworkRef, homeworkPayload);

            // 5. Create assigned_tasks document
            const assignedRef = doc(db, "assigned_tasks", sharedDocId);
            batch.set(assignedRef, {
                ...homeworkPayload,
                taskId: sharedDocId,
                taskTitle: finalTitle,
                taskDescription: assignmentDescription || assigningItem?.description || ''
            });

            // 6. If personal, arrayUnion to user doc
            if (!isGroupWide && (studentUid || studentId)) {
                const targetUId = studentUid || studentId;
                if (targetUId) {
                    const userDocRef = doc(db, 'users', targetUId);
                    batch.set(userDocRef, {
                        personalAssignments: arrayUnion({
                            id: sharedDocId,
                            title: finalTitle,
                            description: assignmentDescription || assigningItem?.description || '',
                            rewardCoins: calculatedCoins,
                            rewardXp: calculatedXp,
                            dueDate: assignmentDeadline || null,
                            coachName: coachDisplayName || 'Тренер',
                            assignedAt: new Date().toISOString(),
                            status: 'active'
                        })
                    }, { merge: true });
                }
            }

            // 7. Update group & club_challenges for syncing with KidDashboard
            if (targetGId && assignmentTargetType === 'group') {
                const groupRef = doc(db, 'groups', targetGId);
                batch.set(groupRef, {
                    weeklyChallengeTitle: finalTitle,
                    weeklyChallengeReward: calculatedXp,
                    weeklyChallengeDeadline: assignmentDeadline || null,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }

            if (groupSport && assignmentTargetType === 'group') {
                const challengeRef = doc(db, 'club_challenges', groupSport);
                batch.set(challengeRef, {
                    weeklyChallengeTitle: finalTitle,
                    weeklyChallengeReward: calculatedXp,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }

            // 8. Send Notifications
            if (!isGroupWide && (studentId || studentUid)) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: studentUid || studentId,
                    type: 'new_assignment',
                    title: '⚡ Новое задание от тренера!',
                    message: `Тренер ${coachDisplayName || 'Тренер'} назначил упражнение: «${finalTitle}» (+${calculatedCoins} монет)`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    read: false
                });
            } else if (isGroupWide && groupStudents && groupStudents.length > 0) {
                groupStudents.forEach(st => {
                    const stId = st.id || st.uid || st.studentId || st.assignedUid;
                    if (stId) {
                        const notifRef = doc(collection(db, "notifications"));
                        batch.set(notifRef, {
                            userId: stId,
                            type: 'new_assignment',
                            title: '⚡ Новое задание для группы!',
                            message: `Тренер ${coachDisplayName || 'Тренер'} назначил упражнение: «${finalTitle}» (+${calculatedCoins} монет)`,
                            createdAt: serverTimestamp(),
                            isRead: false,
                            read: false
                        });
                    }
                });
            }

            await batch.commit();

            // 5. Update local state
            setHomeworkTasks(prev => [
                {
                    id: newPlanRef.id,
                    title: finalTitle,
                    description: assignmentDescription || assigningItem?.description || '',
                    rewardXp: Number(assignmentRewardXp) || 30,
                    deadline: assignmentDeadline,
                    targetType: assignmentTargetType,
                    studentName: targetStudent?.name,
                    createdAt: new Date()
                },
                ...prev.filter(t => t.id !== newPlanRef.id)
            ]);

            setIsAssignmentModalOpen(false);
            setAssigningItem(null);
            setAssignmentTitle('');
            setAssignmentDescription('');
            setSelectedExerciseId('');
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });

        } catch (err) {
            console.error("Error saving assignment:", err);
            alert("Ошибка при создании задания");
        }
        setIsSavingAssignment(false);
    };

    return (
        <div className="space-y-8 dashboard-theme">
            {/* Top Bar with Guide */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-russo text-white uppercase tracking-tight">Рабочая Панель</h2>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Система 2.0 • Система управления Sparta</p>
                </div>
                <button
                    onClick={() => setIsGuideOpen(true)}
                    className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-sparta-gold hover:text-black transition-all"
                >
                    <HelpCircle size={18} className="text-sparta-gold group-hover:text-black" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Инструкция</span>
                </button>
            </div>

            {/* Top Stats Overview (Clean numbers) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Total Students Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    className="bg-card glass-panel border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-sparta-gold/30 transition-all shadow-xl"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold">
                                <Users size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                                    {selectedGroupId ? 'В группе' : 'Всего учеников'}
                                </span>
                                <span className="text-[11px] font-bold text-white/60">
                                    {selectedGroupId ? 'Спортсменов в составе' : 'По всем группам'}
                                </span>
                            </div>
                        </div>
                        <div className="px-2.5 py-1 bg-green-500/10 text-green-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            В строю
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-4xl sm:text-5xl font-russo text-white tracking-tight">
                            {selectedGroupId ? groupStudents.length : myStudents.length}
                        </div>
                        <div className="text-xs font-bold text-white/30 uppercase">чел.</div>
                    </div>
                </motion.div>

                {/* 2. Today's Classes Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    className="bg-card glass-panel border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-xl"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                                <Clock size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                                    Сегодня тренировок
                                </span>
                                <span className="text-[11px] font-bold text-white/60">
                                    {upcomingTraining ? `Ближайшая в ${upcomingTraining.time}` : 'На сегодня всё'}
                                </span>
                            </div>
                        </div>
                        <div className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            Расписание
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-4xl sm:text-5xl font-russo text-white tracking-tight">
                            {todayWorkouts.length}
                        </div>
                        <div className="text-xs font-bold text-white/30 uppercase">
                            {todayWorkouts.length === 1 ? 'сессия' : 'сессий'}
                        </div>
                    </div>
                </motion.div>

                {/* 3. New Trial Requests Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    onClick={() => setMainTab('trials')}
                    className="bg-card glass-panel border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                                    Новых заявок
                                </span>
                                <span className="text-[11px] font-bold text-white/60">
                                    {pendingTrialsCount > 0 ? 'Требуют внимания' : 'Все обработаны'}
                                </span>
                            </div>
                        </div>
                        {pendingTrialsCount > 0 ? (
                            <div className="px-2.5 py-1 bg-emerald-500 text-black rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse">
                                Новые
                            </div>
                        ) : (
                            <div className="px-2.5 py-1 bg-white/5 text-white/40 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                Порядок
                            </div>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-4xl sm:text-5xl font-russo text-white tracking-tight">
                            {pendingTrialsCount}
                        </div>
                        <div className="text-xs font-bold text-white/30 uppercase">заявок</div>
                    </div>
                </motion.div>
            </div>

            {/* Navigation Command Dock v4.0 (4 Primary Tabs) */}
            <div className={`sticky top-8 z-[100] flex flex-wrap items-center gap-2 p-2 backdrop-blur-3xl border rounded-[2.5rem] w-fit mx-auto lg:mx-0 shadow-3xl transition-all duration-500 ${theme === 'light'
                    ? 'bg-white/80 border-black/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                    : 'bg-[#111]/80 border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.3)]'}`}>
                {[
                    { id: 'dashboard', label: '⚽ Главная / Тренировка', icon: LayoutDashboard },
                    { id: 'journal', label: '👥 Мои группы и дети', icon: Users },
                    { id: 'review', label: '📝 Проверка заданий', icon: CheckSquare, badge: pendingSubmissionsCount },
                    { id: 'trials', label: '📥 Новички и заявки', icon: UserPlus, badge: trialRequests.length },
                    { id: 'materials', label: '📋 Упражнения и планы', icon: BookOpen }
                ].map((tab) => {
                    const isActive = mainTab === tab.id || (tab.id === 'materials' && (mainTab === 'exercises' || mainTab === 'programs' || mainTab === 'calendar'));
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id as any)}
                            className={`group relative flex items-center gap-3 px-6 py-3.5 rounded-[1.8rem] transition-all duration-500 overflow-hidden cursor-pointer ${
                                isActive
                                    ? theme === 'light' ? 'text-black font-black' : 'text-white font-black'
                                    : 'text-white/40 hover:text-sparta-gold'
                            }`}
                        >
                            {/* Hover Highlight Overlay */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10 ${theme === 'light' ? 'bg-black/[0.03]' : 'bg-white/[0.03]'}`} />

                            <tab.icon
                                size={18}
                                className={`relative z-10 transition-all duration-500 ${
                                    isActive
                                        ? 'scale-110 text-sparta-gold ring-4 ring-sparta-gold/10 rounded-full'
                                        : 'group-hover:scale-110 group-hover:rotate-3'
                                }`}
                            />
                            <span className={`relative z-10 text-xs font-russo uppercase tracking-wider hidden sm:block transition-all ${
                                isActive ? 'opacity-100' : 'opacity-70'
                            }`}>
                                {tab.label}
                            </span>

                            {tab.badge ? (
                                <div className="absolute top-2 right-2 z-10">
                                    <span className={`flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px] font-black shadow-lg transition-all ${
                                        isActive
                                            ? 'bg-sparta-gold text-black animate-pulse'
                                            : 'bg-white/10 text-white group-hover:bg-sparta-gold group-hover:text-black hover:scale-110'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                </div>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="relative z-10 space-y-8">
                <AnimatePresence mode="wait">
                    {mainTab === 'dashboard' && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <DailyHub
                                theme={theme}
                                user={user}
                                userProfile={userProfile}
                                pendingTrialsCount={pendingTrialsCount}
                                upcomingTraining={upcomingTraining}
                                todayWorkouts={todayWorkouts}
                                selectedGroupId={selectedGroupId}
                                setSelectedGroupId={setSelectedGroupId}
                                myGroups={myGroups}
                                groupStudents={groupStudents}
                                myStudents={myStudents}
                                setMainTab={setMainTab}
                                handleViewStudentProfile={handleViewStudentProfile}
                            />
                        </motion.div>
                    )}

                    {mainTab === 'journal' && (
                        <motion.div
                            key="journal"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <RosterJournalTab
                                theme={theme}
                                myGroups={myGroups}
                                selectedGroupId={selectedGroupId}
                                setSelectedGroupId={setSelectedGroupId}
                                groupStudents={groupStudents}
                                myStudents={myStudents}
                                rosterFilter={rosterFilter}
                                setRosterFilter={setRosterFilter}
                                studentAttendanceStats={studentAttendanceStats}
                                onlineStatuses={onlineStatuses}
                                attendanceDate={attendanceDate}
                                setAttendanceDate={setAttendanceDate}
                                homeworkTasks={homeworkTasks}
                                handleViewStudentProfile={handleViewStudentProfile}
                                setStudentToTransfer={setStudentToTransfer}
                                setIsTransferModalOpen={setIsTransferModalOpen}
                                handleContactParent={handleContactParent}
                                isCompleteProfile={isCompleteProfile}
                                handleTogglePayment={handleTogglePayment}
                                setIsAssignmentModalOpen={handleOpenGroupAssignment}
                                handleAssignPersonalTask={handleAssignPersonalTask}
                                handleEditAssignment={handleOpenEditAssignment}
                                handleDeleteAssignment={handleDeleteAssignment}
                            />
                        </motion.div>
                    )}

                    {mainTab === 'review' && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <CoachReviewDashboard
                                theme={theme}
                                coachId={userProfile?.coachId || user?.uid}
                                coachName={coachDisplayName}
                                myGroups={myGroups}
                                selectedGroupId={selectedGroupId}
                                onViewStudentProfile={handleViewStudentProfile}
                            />
                        </motion.div>
                    )}

                    {mainTab === 'trials' && (
                        <motion.div
                            key="trials"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <TrialsTab
                                trialRequests={trialRequests}
                                myTrialRequests={myTrialRequests}
                                trialEvaluations={trialEvaluations}
                                calculateGroupFit={calculateGroupFit}
                                handleStartComparison={handleStartComparison}
                                handleContactParent={handleContactParent}
                                setSelectedTrialForEval={setSelectedTrialForEval}
                                setIsEvaluationModalOpen={setIsEvaluationModalOpen}
                                setCurrentEvalSkills={setCurrentEvalSkills}
                                myGroups={myGroups}
                                onDeleteRequest={handleDeleteTrialRequest}
                                onViewDetails={handleViewTrialRequest}
                                setSelectedEvalTags={setSelectedEvalTags}
                                setCoachEvalComment={setCoachEvalComment}
                            />
                        </motion.div>
                    )}
                    {mainTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <StatsLab
                                statsError={statsError}
                                theme={theme}
                                coachHistoryStats={coachHistoryStats}
                                comparingTrialId={comparingTrialId}
                                trialEvaluations={trialEvaluations}
                                trialRequests={trialRequests}
                                myGroups={myGroups}
                                selectedGroupId={selectedGroupId}
                                recommendedGroups={recommendedGroups}
                                allGroupsStats={allGroupsStats}
                                groupStudents={groupStudents}
                                calculateGroupFit={calculateGroupFit}
                                setComparingTrialId={setComparingTrialId}
                                setSelectedGroupId={setSelectedGroupId}
                                setSelectedTrialRequest={setSelectedTrialRequest}
                                setIsEnrollModalOpen={setIsEnrollModalOpen}
                                setMainTab={setMainTab}
                            />
                        </motion.div>
                    )}

                    {(mainTab === 'materials' || mainTab === 'exercises' || mainTab === 'programs' || mainTab === 'calendar') && (
                        <motion.div
                            key="materials"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Materials SubTab Switcher */}
                            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-card glass-panel border border-white/10 rounded-2xl w-fit shadow-xl">
                                {[
                                    { id: 'exercises', label: 'База упражнений', icon: Dumbbell },
                                    { id: 'programs', label: 'Программы', icon: Layers },
                                    { id: 'calendar', label: 'Календарь', icon: Calendar }
                                ].map(sub => {
                                    const active = (mainTab === sub.id) || (mainTab === 'materials' && materialsSubTab === sub.id);
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                setMainTab('materials');
                                                setMaterialsSubTab(sub.id as any);
                                            }}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-russo uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                                active
                                                    ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20'
                                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <sub.icon size={15} />
                                            <span>{sub.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* View 1: Calendar */}
                            {((mainTab === 'materials' && materialsSubTab === 'calendar') || mainTab === 'calendar') && (
                                <div className="bg-card glass-panel border border-main rounded-[2.5rem] p-6 sm:p-8 min-h-[600px] relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-0 w-full h-full bg-sparta-gold/5 opacity-50 pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                            <div>
                                                <h3 className="text-2xl font-russo text-white uppercase tracking-tight mb-1">Календарь Расписания</h3>
                                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Планирование тренировок и событий</p>
                                            </div>
                                        </div>

                                        <div className="bg-field glass-panel border border-main rounded-3xl p-4 sm:p-6 min-h-[500px]">
                                            <CoachCalendar userProfile={userProfile} myGroups={myGroups} exercises={exercises} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View 2: Exercises */}
                            {((mainTab === 'materials' && materialsSubTab === 'exercises') || mainTab === 'exercises') && (
                                <div className="dashboard-theme min-h-[800px] p-4 lg:p-10 rounded-[3.5rem] relative overflow-hidden">
                                    {/* Header Section v3.0 */}
                                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold">
                                                <Dumbbell size={24} />
                                            </div>
                                            <h3 className="text-3xl font-russo text-white uppercase tracking-tight flex items-center gap-4">
                                                База мероприятий
                                                <button
                                                    onClick={() => setIsExerciseGuideOpen(true)}
                                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-sparta-gold transition-all"
                                                    title="Как это работает?"
                                                >
                                                    <Info size={16} />
                                                </button>
                                            </h3>
                                        </div>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">
                                            Библиотека обучающих материалов • {exercises.length} видео • Мой архив
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsExerciseGuideOpen(true)}
                                            className="hidden md:flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white transition-all uppercase"
                                        >
                                            <HelpCircle size={16} className="text-sparta-gold" />
                                            Гайд по базе
                                        </button>
                                        <button
                                            onClick={handleSmartAutoSort}
                                            disabled={isSmartSorted || exercises.length === 0}
                                            className={`hidden md:flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black transition-all uppercase border group relative overflow-hidden ${isSmartSorted
                                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                                    : 'bg-white/5 border-white/10 text-white/40 hover:text-sparta-gold hover:border-sparta-gold/30'
                                                }`}
                                        >
                                            {isSmartSorted ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>
                                                        {sortingStatus === 'scanning' ? 'Сканирование...' :
                                                            sortingStatus === 'linking' ? 'Связывание...' :
                                                                sortingStatus === 'cleaning' ? 'Очистка...' :
                                                                    sortingStatus === 'done' ? 'Готово!' : 'Сортировка...'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Brain size={16} className="group-hover:scale-110 transition-transform" />
                                                    Умная сортировка
                                                </>
                                            )}
                                            {isSmartSorted && (
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    className="absolute bottom-0 left-0 h-0.5 bg-purple-500"
                                                    transition={{ duration: 7.5, ease: "linear" }}
                                                />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setIsExerciseModalOpen(true)}
                                            className="group relative px-8 py-4 bg-sparta-gold text-black rounded-2xl hover:bg-white transition-all shadow-2xl shadow-sparta-gold/20 flex items-center gap-3 active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                            <PlusCircle size={20} className="relative z-10" />
                                            <span className="relative z-10 text-[11px] font-black uppercase tracking-widest">+ НОВОЕ УПРАЖНЕНИЕ</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Search & Tactical Control Center v4.0 */}
                                <div className="relative z-10 space-y-8 mb-16">
                                    {/* Enhanced Search Intelligence */}
                                    <div className="max-w-4xl relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-sparta-gold/20 to-transparent rounded-[2.2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                                        <Search className={`absolute left-7 top-1/2 -translate-y-1/2 transition-all duration-500 scale-110 ${theme === 'light' ? 'text-black/20 group-focus-within:text-sparta-gold' : 'text-white/20 group-focus-within:text-sparta-gold'}`} size={22} />
                                        <input
                                            type="text"
                                            placeholder="Найти по названию, мышцечной группе или технике..."
                                            value={exerciseSearchQuery}
                                            onChange={(e) => setExerciseSearchQuery(e.target.value)}
                                            className={`w-full backdrop-blur-3xl border rounded-[2rem] pl-18 pr-40 py-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-3xl outline-none relative z-10 ${theme === 'light'
                                                    ? 'bg-white border-black/[0.05] text-black placeholder:text-black/30'
                                                    : 'bg-field/40 border-white/[0.05] text-white placeholder:text-white/20'}`}
                                        />
                                        <div className={`absolute right-8 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border z-20 backdrop-blur-md ${theme === 'light' ? 'bg-black/5 text-black/40 border-black/5' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                            {exercises.filter(ex => ex.title.toLowerCase().includes(exerciseSearchQuery.toLowerCase())).length} Results Found
                                        </div>
                                    </div>

                                    {/* Quick Command Tags */}
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-dashed transition-all ${theme === 'light' ? 'text-black/30 border-black/10' : 'text-white/20 border-white/10'}`}>
                                            <Zap size={14} className="text-sparta-gold" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Quick Filter:</span>
                                        </div>
                                        {[
                                            { label: 'Разминка', query: 'Разминка' },
                                            { label: 'Дриблинг', query: 'Дриблинг' },
                                            { label: 'Junior (U10)', query: 'U10' },
                                            { label: 'Elite (U16)', query: 'U16' },
                                            { label: 'Power', query: 'Силовая' },
                                            { label: 'Clear', query: '', ghost: true, icon: XCircle }
                                        ].map((tag) => (
                                            <button
                                                key={tag.label}
                                                onClick={() => setExerciseSearchQuery(tag.query)}
                                                className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase transition-all border flex items-center gap-2 shadow-sm ${exerciseSearchQuery === tag.query
                                                        ? 'bg-sparta-gold text-black border-sparta-gold shadow-lg shadow-sparta-gold/30'
                                                        : tag.ghost
                                                            ? theme === 'light' ? 'text-black/40 border-black/5 hover:bg-red-500/10 hover:text-red-500' : 'text-white/20 border-white/5 hover:bg-red-500/10 hover:text-red-500'
                                                            : theme === 'light' ? 'bg-white text-black/60 border-black/[0.05] hover:border-black/20 hover:scale-105' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:scale-105'
                                                    }`}
                                            >
                                                {tag.icon && <tag.icon size={12} />}
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Premium Category Navigator */}
                                    <div className="flex flex-wrap items-center gap-4 py-4 border-y border-white/[0.03]">
                                        {EXERCISE_CATEGORIES.map((cat) => {
                                            const count = cat.id === 'all'
                                                ? exercises.length
                                                : exercises.filter(ex => ex.category === cat.id).length;

                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedExerciseCategory(cat.id)}
                                                    className={`px-8 py-5 rounded-[2.2rem] flex items-center gap-5 transition-all duration-700 min-w-[200px] group border relative overflow-hidden backdrop-blur-xl ${selectedExerciseCategory === cat.id
                                                            ? 'bg-sparta-gold text-black border-sparta-gold shadow-[0_20px_40px_rgba(212,175,55,0.2)] scale-105 z-10'
                                                            : theme === 'light'
                                                                ? 'bg-white text-black/50 border-black/[0.05] hover:border-black/20 hover:bg-black/[0.01]'
                                                                : 'bg-white/[0.03] text-white/40 border-white/[0.05] hover:border-white/20 hover:bg-white/[0.06]'
                                                        }`}
                                                >
                                                    <div className={`p-3 rounded-2xl transition-all duration-500 shadow-inner ${selectedExerciseCategory === cat.id ? 'bg-black/10' : 'bg-sparta-gold/10'}`}>
                                                        <cat.icon size={20} className={`transition-transform duration-700 group-hover:scale-125 group-hover:rotate-6 ${selectedExerciseCategory === cat.id ? 'text-black' : 'text-sparta-gold'}`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{cat.label}</span>
                                                        <span className={`text-[9px] font-bold uppercase tracking-tight ${selectedExerciseCategory === cat.id ? 'text-black/50' : 'text-white/20'}`}>
                                                            {count} Items Active
                                                        </span>
                                                    </div>

                                                    {selectedExerciseCategory === cat.id && (
                                                        <motion.div
                                                            layoutId="catGlow"
                                                            className="absolute -right-8 -top-8 w-24 h-24 bg-white/20 blur-3xl rounded-full"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Tactical Collections Switcher */}
                                    <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.22em] mr-2">Мои коллекции:</span>
                                        <button
                                            onClick={() => setSelectedCollectionId('all')}
                                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedCollectionId === 'all'
                                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                                    : 'bg-white/5 text-white/20 border border-white/5 hover:border-white/20 hover:text-white'
                                                }`}
                                        >
                                            ВСЕ ПАПКИ</button>
                                        {exerciseCollections.map((col) => (
                                            <button
                                                key={col.id}
                                                onClick={() => setSelectedCollectionId(col.id)}
                                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 group flex items-center gap-3 ${selectedCollectionId === col.id
                                                        ? 'bg-purple-500/20 text-purple-400 border shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                                        : 'bg-white/5 text-white/20 border border-white/5 hover:border-white/20 hover:text-white'
                                                    }`}
                                                style={{ borderColor: selectedCollectionId === col.id ? col.color : 'rgba(255,255,255,0.05)' }}
                                            >
                                                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: col.color || '#D4AF37' }} />
                                                {col.title}
                                                <div className="flex items-center gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Pencil
                                                        size={12}
                                                        className="hover:text-sparta-gold transition-all cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingCollection(col);
                                                            setNewCollectionData({ title: col.title, color: col.color || '#D4AF37' });
                                                            setIsCollectionModalOpen(true);
                                                        }}
                                                    />
                                                    <TrashIcon
                                                        size={12}
                                                        className="hover:text-red-500 transition-all cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setIsCollectionModalOpen(true)}
                                            className="p-3 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white/20 hover:text-sparta-gold hover:border-sparta-gold/30 transition-all flex items-center gap-3 group px-5"
                                            title="Создать коллекцию"
                                        >
                                            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">СОЗДАТЬ ПАПКУ</span>
                                        </button>
                                        <button
                                            onClick={handleSmartAutoSort}
                                            disabled={isSmartSorted}
                                            className={`p-3 border border-dashed rounded-2xl transition-all flex items-center gap-3 px-5 group relative overflow-hidden ${isSmartSorted
                                                    ? 'bg-sparta-gold/10 border-sparta-gold/30 text-sparta-gold'
                                                    : 'bg-white/5 border-white/10 text-white/20 hover:text-sparta-gold hover:border-sparta-gold/30'
                                                }`}
                                            title="Умная сортировка по папкам"
                                        >
                                            {isSmartSorted ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />}
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">УМНАЯ СОРТИРОВКА</span>
                                            {isSmartSorted && (
                                                <motion.div
                                                    className="absolute bottom-0 left-0 h-0.5 bg-sparta-gold"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    transition={{ duration: 2 }}
                                                />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
                                    {exercises
                                        .filter(ex => (selectedExerciseCategory === 'all' || ex.category === selectedExerciseCategory) &&
                                            (selectedCollectionId === 'all' || ex.collectionId === selectedCollectionId) &&
                                            (ex.title.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) || ex.description.toLowerCase().includes(exerciseSearchQuery.toLowerCase())))
                                        .map(ex => {
                                            const isHovered = hoveredExerciseId === ex.id;
                                            const mainMedia = ex.mediaItems?.[0] || { url: ex.mediaUrl, type: ex.mediaType };

                                            const level = ex.level;
                                            const equipment = ex.equipment || [];

                                            return (
                                                <motion.div
                                                    key={ex.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    onMouseEnter={() => setHoveredExerciseId(ex.id)}
                                                    onMouseLeave={() => setHoveredExerciseId(null)}
                                                    onClick={(e) => {
                                                        const isSelected = selectedExerciseIds.includes(ex.id);

                                                        // Selection logic
                                                        if (e.ctrlKey || e.metaKey || selectedExerciseIds.length > 0) {
                                                            e.stopPropagation();
                                                            if (e.shiftKey && lastSelectedId) {
                                                                const allVisibleIds = exercises
                                                                    .filter(ex => (selectedExerciseCategory === 'all' || ex.category === selectedExerciseCategory) &&
                                                                        (selectedCollectionId === 'all' || ex.collectionId === selectedCollectionId))
                                                                    .map(e => e.id);
                                                                const startIdx = allVisibleIds.indexOf(lastSelectedId);
                                                                const endIdx = allVisibleIds.indexOf(ex.id);
                                                                const rangeIds = allVisibleIds.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);

                                                                setSelectedExerciseIds(prev => Array.from(new Set([...prev, ...rangeIds])));
                                                            } else {
                                                                if (isSelected) {
                                                                    setSelectedExerciseIds(prev => prev.filter(id => id !== ex.id));
                                                                } else {
                                                                    setSelectedExerciseIds(prev => [...prev, ex.id]);
                                                                    setLastSelectedId(ex.id);
                                                                }
                                                            }
                                                        } else {
                                                            // Normal lightbox logic
                                                            const items = ex.mediaItems || [{ url: ex.mediaUrl, type: ex.mediaType }];
                                                            setSelectedMediaForLightbox({
                                                                items: items,
                                                                currentIndex: 0,
                                                                title: ex.title
                                                            });
                                                        }
                                                    }}
                                                    className={`group relative rounded-[2.8rem] transition-all duration-700 cursor-pointer shadow-3xl flex flex-col h-full active:scale-[0.99] group/card-exercise border min-w-[300px] max-w-full ${selectedExerciseIds.includes(ex.id)
                                                            ? 'border-purple-500 ring-4 ring-purple-500/20 bg-purple-500/5'
                                                            : clipboardIds.includes(ex.id)
                                                                ? 'border-sparta-gold/50 shadow-sparta-gold/10'
                                                                : theme === 'light'
                                                                    ? 'bg-white border-black/[0.08] hover:border-sparta-gold/40'
                                                                    : 'bg-[#1a1a1a] border-white/5 hover:border-sparta-gold/40'}`}
                                                >
                                                    {/* Selection Indicator Overlay */}
                                                    {(isHovered || selectedExerciseIds.includes(ex.id)) && (
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const isSelected = selectedExerciseIds.includes(ex.id);
                                                                if (isSelected) {
                                                                    setSelectedExerciseIds(prev => prev.filter(id => id !== ex.id));
                                                                } else {
                                                                    setSelectedExerciseIds(prev => [...prev, ex.id]);
                                                                    setLastSelectedId(ex.id);
                                                                }
                                                            }}
                                                            className={`absolute top-4 right-4 z-[40] w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xl backdrop-blur-xl border ${selectedExerciseIds.includes(ex.id)
                                                                    ? 'bg-purple-500 text-white border-purple-400'
                                                                    : 'bg-black/40 text-white/40 border-white/10 hover:bg-black/60 hover:text-white'
                                                                }`}
                                                        >
                                                            {selectedExerciseIds.includes(ex.id) ? (
                                                                <Check size={20} strokeWidth={3} />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full border-2 border-current opacity-40" />
                                                            )}
                                                        </motion.button>
                                                    )}
                                                    {/* Card Media v4.5 - Theme-Aware Visuals */}
                                                    <div className="h-56 relative overflow-hidden bg-black/60">
                                                        <AnimatePresence mode="wait">
                                                            {isHovered && (mainMedia.type === 'video' || mainMedia.type === 'url') ? (
                                                                <motion.div
                                                                    key="preview"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="absolute inset-0 z-10"
                                                                >
                                                                    {mainMedia.type === 'video' ? (
                                                                        <video
                                                                            src={mainMedia.url}
                                                                            autoPlay
                                                                            muted
                                                                            loop
                                                                            playsInline
                                                                            className="w-full h-full object-cover scale-105"
                                                                        />
                                                                    ) : (
                                                                        <iframe
                                                                            src={`https://www.youtube.com/embed/${mainMedia.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1]}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${mainMedia.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1]}`}
                                                                            className="w-full h-full object-cover scale-[1.7] pointer-events-none"
                                                                            allow="autoplay"
                                                                        />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                                                                </motion.div>
                                                            ) : (
                                                                <motion.div
                                                                    key="thumbnail"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="absolute inset-0"
                                                                >
                                                                    {mainMedia.type === 'photo' ? (
                                                                        <img
                                                                            src={mainMedia.url}
                                                                            alt={ex.title}
                                                                            className="w-full h-full object-cover group-hover/card-exercise:scale-110 transition-transform duration-1000"
                                                                        />
                                                                    ) : (mainMedia.type === 'url' || mainMedia.type === 'video') ? (
                                                                        <img
                                                                            src={mainMedia.type === 'url'
                                                                                ? `https://img.youtube.com/vi/${mainMedia.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1]}/maxresdefault.jpg`
                                                                                : mainMedia.url
                                                                            }
                                                                            alt={ex.title}
                                                                            className="w-full h-full object-cover opacity-70 group-hover/card-exercise:opacity-100 group-hover/card-exercise:scale-110 transition-all duration-1000"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                                                                            <Dumbbell size={48} className={`transition-colors ${theme === 'light' ? 'text-black/10' : 'text-white/5'}`} />
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Badges Overlay v4.5 - Universal Contrast */}
                                                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-3.5 py-1.5 bg-black/80 backdrop-blur-xl rounded-xl text-[9px] font-black uppercase text-sparta-gold border border-sparta-gold/30 tracking-[0.15em] shadow-2xl">
                                                                        {EXERCISE_CATEGORIES.find(c => c.id === ex.category)?.label || 'Упр.'}
                                                                    </span>
                                                                    {level && (
                                                                        <span className={`px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-xl shadow-2xl ${level === 'advanced' ? 'bg-red-500 text-white border-red-400/50' :
                                                                                level === 'intermediate' ? 'bg-sparta-gold text-black border-sparta-gold/50' :
                                                                                    'bg-green-600 text-white border-green-400/50'
                                                                            }`}>
                                                                            {level === 'advanced' ? 'PRO' : level === 'intermediate' ? 'MED' : 'EASY'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">

                                                                {(ex.mediaItems?.length > 1) && (
                                                                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white/60 rounded-xl text-[9px] font-black flex items-center gap-2 border border-white/5 shadow-2xl">
                                                                        <Layers size={14} className="text-sparta-gold/60" /> {ex.mediaItems.length}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Glass Play Indicator */}
                                                        <motion.div
                                                            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                                                            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                                                        >
                                                            <div className="w-16 h-16 rounded-full bg-sparta-gold text-black shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center border-4 border-black/20">
                                                                <Play size={28} className="ml-1" />
                                                            </div>
                                                        </motion.div>
                                                    </div>

                                                    {/* Card Content v4.6 - Optimized Visibility */}
                                                    <div className={`p-6 flex-1 flex flex-col relative transition-colors ${theme === 'light' ? 'bg-white' : 'bg-gradient-to-b from-transparent to-black/20'}`}>
                                                        <div className="mb-4">
                                                            <h4 className={`font-russo text-lg mb-1 line-clamp-1 transition-colors tracking-tight uppercase ${theme === 'light' ? 'text-black group-hover/card-exercise:text-sparta-gold' : 'text-white group-hover/card-exercise:text-sparta-gold'}`}>
                                                                {ex.title}
                                                            </h4>
                                                            <p className={`text-[11px] font-medium leading-relaxed line-clamp-2 italic ${theme === 'light' ? 'text-black/60' : 'text-white/40'}`}>
                                                                "{ex.description || 'Нет описания'}"
                                                            </p>
                                                        </div>

                                                        {/* Tactical Tag Cloud */}
                                                        <div className="flex flex-wrap gap-2 mb-6">
                                                            {equipment.map((eq: string, i: number) => (
                                                                <span key={i} className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase border tracking-widest flex items-center gap-1.5 transition-colors ${theme === 'light'
                                                                        ? 'bg-black/[0.03] text-black/60 border-black/5'
                                                                        : 'bg-white/5 text-white/60 border-white/10'
                                                                    }`}>
                                                                    <Dumbbell size={10} className="text-sparta-gold/40" />
                                                                    {eq}
                                                                </span>
                                                            ))}
                                                            {ex.muscles?.map((mId: string, i: number) => {
                                                                const m = MUSCLE_GROUPS.find(mg => mg.id === mId);
                                                                return m ? (
                                                                    <span key={`m-${i}`} className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase border tracking-widest flex items-center gap-1.5 transition-colors ${theme === 'light'
                                                                            ? 'bg-sparta-gold/10 text-sparta-gold-dark border-sparta-gold/30'
                                                                            : 'bg-sparta-gold/10 text-sparta-gold border-sparta-gold/20'
                                                                        }`}>
                                                                        <span className="text-[12px]">{m.icon}</span>
                                                                        {m.label}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>

                                                        {/* Refined Actions Footer v4.6 */}
                                                        <div className={`mt-auto pt-4 border-t flex items-center justify-between gap-3 transition-colors ${theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sparta-gold text-[9px] font-black border transition-all ${theme === 'light'
                                                                        ? 'bg-black/5 border-black/5'
                                                                        : 'bg-white/5 border-white/10'}`}>
                                                                    {ex.coachName?.charAt(0) || 'S'}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={`text-[7px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-black/30' : 'text-white/20'}`}>Sync</span>
                                                                    <span className={`text-[8.5px] font-black uppercase tracking-widest transition-colors truncate max-w-[60px] ${theme === 'light' ? 'text-black/50' : 'text-white/40'}`}>
                                                                        {ex.coachName || 'System'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <div className={`flex items-center p-0.5 rounded-xl border backdrop-blur-xl transition-colors ${theme === 'light' ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/10'}`}>
                                                                    {[
                                                                        { icon: Pencil, onClick: () => handleOpenEditModal(ex), title: 'Правка', color: 'hover:text-sparta-gold' },
                                                                        { icon: Copy, onClick: () => handleOpenCopyModal(ex), title: 'Копия', color: 'hover:text-sparta-gold' },
                                                                        { icon: FolderOpen, onClick: () => setMovingExerciseId(movingExerciseId === ex.id ? null : ex.id), title: 'В папку', color: 'hover:text-purple-400' },
                                                                        { icon: TrashIcon, onClick: () => handleDeleteExercise(ex.id, ex.mediaItems || []), title: 'Удалить', color: 'hover:text-red-500' }
                                                                    ].map((btn, i) => (
                                                                        <button
                                                                            key={i}
                                                                            onClick={(e) => { e.stopPropagation(); btn.onClick(); }}
                                                                            className={`p-1.5 rounded-lg transition-all hover:bg-white/10 active:scale-90 ${theme === 'light' ? 'text-black/30' : 'text-white/20'} ${btn.color}`}
                                                                            title={btn.title}
                                                                        >
                                                                            <btn.icon size={12} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenAssignmentModal(ex, 'exercise'); }}
                                                                    className="w-9 h-9 bg-sparta-gold text-black rounded-xl hover:bg-white transition-all active:scale-90 shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center justify-center"
                                                                    title="Назначить"
                                                                >
                                                                    <PlusCircle size={16} />
                                                                </button>
                                                            </div>
                                                            {/* Quick Folder Move Overlay */}
                                                            <AnimatePresence>
                                                                {movingExerciseId === ex.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        className="absolute bottom-16 right-6 z-50 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 w-48 shadow-2xl overflow-hidden"
                                                                    >
                                                                        <div className="text-[8px] font-black uppercase text-white/30 p-2 border-b border-white/5 mb-1">Переместить в:</div>
                                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleMoveExercise(ex.id, 'all'); }}
                                                                                className={`w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-3 transition-colors ${ex.collectionId === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                                                            >
                                                                                <div className="w-2 h-2 rounded-full bg-white/20" />
                                                                                Общий список
                                                                            </button>
                                                                            {exerciseCollections.map(col => (
                                                                                <button
                                                                                    key={col.id}
                                                                                    onClick={(e) => { e.stopPropagation(); handleMoveExercise(ex.id, col.id); }}
                                                                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-3 transition-colors ${ex.collectionId === col.id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                                                                >
                                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                                                                                    {col.title}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                    {exercises.length === 0 && (
                                        <div className="col-span-full py-24 text-center bg-white/[0.02] rounded-[4rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center group overflow-hidden relative">
                                            <div className="absolute inset-0 bg-gradient-to-b from-sparta-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500">
                                                <Dumbbell size={48} className="text-white/10 group-hover:text-sparta-gold/40 transition-colors" />
                                            </div>

                                            <h4 className="text-2xl font-russo uppercase tracking-widest text-white/20 mb-3 relative z-10">Архив пока пуст</h4>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 max-w-sm leading-relaxed mb-10 relative z-10">
                                                Добавьте свое первое упражнение или используйте наш базовый набор для быстрого старта
                                            </p>

                                            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                                                <button
                                                    onClick={() => setIsExerciseModalOpen(true)}
                                                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-sparta-gold transition-all shadow-xl shadow-black/20"
                                                >
                                                    Создать упражнение
                                                </button>
                                                <button
                                                    onClick={handleAddDefaultExercises}
                                                    disabled={isSavingExercise}
                                                    className="px-8 py-4 bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-sparta-gold hover:text-black transition-all disabled:opacity-50"
                                                >
                                                    {isSavingExercise ? 'Р—агрузка...' : 'Добавить базовый набор'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Floating Selection Tray v1.0 */}
                        <AnimatePresence>
                            {selectedExerciseIds.length > 0 && (
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 100, opacity: 0 }}
                                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-purple-500/30 rounded-[2.5rem] p-3 pl-8 shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(168,85,247,0.1)] ring-1 ring-white/10"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[14px] font-russo text-white uppercase tracking-widest leading-none">
                                            {selectedExerciseIds.length} ВЫБРАНО
                                        </span>
                                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-tight mt-1">
                                            МТ-Управление Библиотекой
                                        </span>
                                    </div>

                                    <div className="h-10 w-px bg-white/10 mx-4" />

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setClipboardIds(selectedExerciseIds);
                                                // Optional: visual pulse
                                            }}
                                            className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border border-white/5"
                                        >
                                            <Copy size={14} className="text-sparta-gold" />
                                            Копировать
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (selectedCollectionId !== 'all') {
                                                    handleBulkMove(selectedExerciseIds, selectedCollectionId);
                                                } else {
                                                    alert("Выберите папку для перемещения в меню слева");
                                                }
                                            }}
                                            className="h-12 px-6 rounded-2xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-purple-500/20"
                                        >
                                            <FolderOpen size={14} />
                                            В эту папку
                                        </button>

                                        <button
                                            onClick={() => handleBulkDelete(selectedExerciseIds)}
                                            className="w-12 h-12 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/20"
                                            title="Удалить выбранные"
                                        >
                                            <TrashIcon size={18} />
                                        </button>

                                        <div className="w-px h-6 bg-white/10 mx-2" />

                                        <button
                                            onClick={() => setSelectedExerciseIds([])}
                                            className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center"
                                            title="Сбросить выделение"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Shortcut Hints */}
                                    <div className="hidden lg:flex items-center gap-4 ml-8 pr-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] font-black text-white/20 uppercase mb-1">Copy</span>
                                            <kbd className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-black text-white/40 border border-white/10">CTRL+C</kbd>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] font-black text-white/20 uppercase mb-1">Paste</span>
                                            <kbd className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-black text-white/40 border border-white/10">CTRL+V</kbd>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* View 3: Programs */}
                        {((mainTab === 'materials' && materialsSubTab === 'programs') || mainTab === 'programs') && (
                            <div className="space-y-8">
                                {/* Pro Header & Onboarding */}
                                <div className="bg-card glass-panel border border-purple-500/20 rounded-[2.5rem] p-10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><FileText size={160} /></div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div className="max-w-xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 shadow-lg shadow-purple-500/10">
                                                    <Layers size={32} />
                                                </div>
                                                <h3 className="text-3xl font-russo text-white uppercase tracking-tight">Библиотека программ</h3>
                                            </div>
                                            <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] leading-relaxed mb-2">
                                                Создавайте универсальные циклы тренировок для быстрого планирования сезона
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsTemplateModalOpen(true)}
                                            className="h-fit bg-purple-500 text-white hover:bg-white hover:text-black font-black uppercase tracking-widest text-[11px] px-8 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center gap-3"
                                        >
                                            <PlusCircle size={20} />
                                            СОЗДАТЬ ПРОГРАММУ
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {trainingTemplates.map(template => (
                                        <div key={template.id} className="p-0 bg-card glass-panel border border-white/5 rounded-[3rem] hover:border-purple-500/40 transition-all group relative flex flex-col min-h-[380px] overflow-hidden">
                                            {/* Cover Image Background */}
                                            {template.coverImage ? (
                                                <div className="absolute inset-0 z-0">
                                                    <img
                                                        src={template.coverImage}
                                                        className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700"
                                                        alt=""
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0a0a0a]" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900/10 to-transparent" />
                                            )}

                                            <div className="relative z-10 p-8 flex-1 flex flex-col">
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => setSelectedProgramForPreview(template)}
                                                >
                                                    <div className="flex justify-between items-start mb-6">
                                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-500/10">
                                                            {template.category || 'Техника'}
                                                        </span>
                                                        <div className="flex flex-col items-end gap-3">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDuplicateTemplate(template);
                                                                    }}
                                                                    className="p-2 bg-white/5 hover:bg-sparta-gold/20 text-white/20 hover:text-sparta-gold rounded-lg transition-all border border-white/5"
                                                                    title="Дублировать"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenEditTemplateModal(template);
                                                                    }}
                                                                    className="p-2 bg-white/5 hover:bg-purple-500/20 text-white/20 hover:text-purple-400 rounded-lg transition-all border border-white/5"
                                                                    title="Редактировать"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('Вы уверены, что хотите удалить эту программу?')) {
                                                                            handleDeleteTemplate(template.id);
                                                                        }
                                                                    }}
                                                                    className="p-2 bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-all border border-white/5"
                                                                    title="Удалить"
                                                                >
                                                                    <TrashIcon size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">Состав программы</span>
                                                                <div className="flex gap-1.5">
                                                                    {(['warmup', 'main', 'skills', 'cooldown'] as const).map(s => {
                                                                        const count = template.stages?.[s]?.length || 0;
                                                                        return (
                                                                            <div
                                                                                key={s}
                                                                                className={`w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-black transition-all
                                                                                    ${count > 0 ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/10'}`}
                                                                                title={s}
                                                                            >
                                                                                {count}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight line-clamp-2 group-hover:text-purple-400 transition-colors">{template.title}</h4>
                                                    <p className="text-[11px] text-white/30 uppercase font-black leading-relaxed line-clamp-4 mb-4">
                                                        {template.description || 'Индивидуальный тренировочный цикл, разделенный на блоки для максимальной эффективности подготовки.'}
                                                    </p>
                                                </div>

                                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-white uppercase">{template.duration || 4} Недели</span>
                                                        <span className="text-[8px] font-bold text-white/20 uppercase">Длительность</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenAssignmentModal(template, 'program')}
                                                        className="px-6 py-4 bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-500/20 hover:bg-white hover:text-black transition-all active:scale-95"
                                                    >
                                                        В РАСПИСАНИЕ
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

            {/* MODALS */}
            <AnimatePresence>
                {isRequestDetailsModalOpen && selectedRequestForDetails && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-[4rem] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-sparta-gold/10 rounded-full blur-3xl opacity-50" />

                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <h3 className="text-3xl font-russo text-white uppercase mb-2 flex items-center gap-4">
                                        <div className="p-3 bg-sparta-gold/20 rounded-2xl text-sparta-gold"><UserPlus size={24} /></div>
                                        <span>Детали заявки</span>
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                        Дата подачи: {selectedRequestForDetails.createdAt ? (
                                            typeof selectedRequestForDetails.createdAt.toDate === 'function'
                                                ? format(selectedRequestForDetails.createdAt.toDate(), 'dd.MM.yyyy HH:mm')
                                                : typeof selectedRequestForDetails.createdAt === 'string'
                                                    ? format(parseISO(selectedRequestForDetails.createdAt), 'dd.MM.yyyy HH:mm')
                                                    : 'Некорректная дата'
                                        ) : 'Неизвестно'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsRequestDetailsModalOpen(false)}
                                    className="p-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-8 relative z-10">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Ребенок</p>
                                            <p className="text-lg font-bold text-white">{selectedRequestForDetails.childName || selectedRequestForDetails.name}</p>
                                            <p className="text-[10px] font-bold text-sparta-gold uppercase mt-1">Возраст: {selectedRequestForDetails.childAge || 'Не указан'}</p>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Родитель</p>
                                            <p className="text-sm font-bold text-white">{selectedRequestForDetails.parentName || 'Не указан'}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Phone size={12} className="text-sparta-gold" />
                                                <span className="text-xs text-white/60">{selectedRequestForDetails.phone || 'Нет телефона'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-4">Заметки / Комментарий</p>
                                        <div className="flex-1 text-xs text-white/60 leading-relaxed overflow-y-auto custom-scrollbar">
                                            {selectedRequestForDetails.notes || selectedRequestForDetails.comment || 'Комментарии отсутствуют.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => {
                                            handleContactParent(selectedRequestForDetails);
                                            setIsRequestDetailsModalOpen(false);
                                        }}
                                        className="flex-1 py-5 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-3 border border-white/10"
                                    >
                                        <MessageSquare size={18} />
                                        Написать
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedTrialRequest(selectedRequestForDetails);
                                            setIsEnrollModalOpen(true);
                                            setIsRequestDetailsModalOpen(false);
                                        }}
                                        className="flex-1 py-5 bg-sparta-gold text-black rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-sparta-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle size={18} />
                                        Зачислить
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isEvaluationModalOpen && selectedTrialForEval && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto">
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-[#0a0a0a] border border-white/10 rounded-[4rem] p-12 max-w-6xl w-full shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-12">
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-sparta-gold/10 rounded-full blur-3xl opacity-50" />

                            {/* LEFT: Evaluation Column */}
                            <div className="flex-1 space-y-8 relative z-10">
                                <div>
                                    <h3 className="text-3xl font-russo text-white uppercase mb-2 flex items-center gap-4">
                                        <div className="p-3 bg-sparta-gold/20 rounded-2xl text-sparta-gold"><Zap size={24} /></div>
                                        <span>Скаутинг-отчет</span>
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                        Ученик: {selectedTrialForEval.childSurname} {selectedTrialForEval.childName}
                                    </p>
                                </div>

                                {/* Potential Badge */}
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Потенциал игрока</p>
                                        <p className={`text-xl font-russo uppercase ${(() => {
                                                const avg = Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5;
                                                return avg > 80 ? 'text-sparta-gold' : avg > 50 ? 'text-blue-400' : 'text-orange-400';
                                            })()
                                            }`}>
                                            {(() => {
                                                const avg = Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5;
                                                return avg > 80 ? 'GOLD ELITE' : avg > 50 ? 'SILVER PRO' : 'BRONZE START';
                                            })()}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <Trophy size={20} className={
                                            (Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5) > 80 ? 'text-sparta-gold' : 'text-white/20'
                                        } />
                                    </div>
                                </div>

                                {/* Skills Selection */}
                                <div className="space-y-6">
                                    {[
                                        { id: 'technique', label: 'Техника', icon: Shield },
                                        { id: 'strength', label: 'Физика', icon: Zap },
                                        { id: 'speed', label: 'Скорость', icon: TrendingUp },
                                        { id: 'endurance', label: 'Выносливость', icon: ActivityIcon },
                                        { id: 'discipline', label: 'Дисциплина', icon: Award }
                                    ].map((skill) => (
                                        <div key={skill.id} className="group">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <skill.icon size={12} className="text-white/20 group-hover:text-sparta-gold transition-colors" />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{skill.label}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {[20, 40, 60, 80, 100].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setCurrentEvalSkills({ ...currentEvalSkills, [skill.id]: val })}
                                                        className={`flex-1 h-3 rounded-full transition-all ${(currentEvalSkills as any)[skill.id] >= val
                                                                ? 'bg-sparta-gold shadow-lg shadow-sparta-gold/20'
                                                                : 'bg-white/5'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick Tags */}
                                <div className="space-y-4">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Быстрые метки</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['⚡ Быстрый', '🛡️ Цепкий', '🎯 Техничный', '💪 Физик', '🧠 Умный', '🤝 Командный'].map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    if (selectedEvalTags.includes(tag)) {
                                                        setSelectedEvalTags(selectedEvalTags.filter(t => t !== tag));
                                                    } else {
                                                        setSelectedEvalTags([...selectedEvalTags, tag]);
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${selectedEvalTags.includes(tag)
                                                        ? 'bg-sparta-gold text-black border-sparta-gold'
                                                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Internal Message to Parent */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Сообщение для родителей</p>
                                            {selectedTrialForEval?.parentUserId ? (
                                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[7px] font-black uppercase rounded-full border border-green-500/20">Родитель на связи</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[7px] font-black uppercase rounded-full border border-red-500/20">Не привязан</span>
                                            )}
                                        </div>
                                        <span className="text-[8px] text-sparta-gold font-bold uppercase">Внутренняя почта</span>
                                    </div>

                                    {!selectedTrialForEval?.parentUserId ? (
                                        <div className="w-full p-6 bg-white/5 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                                                <Lock size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Сообщения недоступны</p>
                                                <p className="text-[9px] text-white/20 mt-1 leading-tight">Родитель еще не привязал ребенка<br />в своем кабинете</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={coachEvalComment}
                                            onChange={(e) => setCoachEvalComment(e.target.value)}
                                            placeholder="Напишите краткий отзыв о просмотре... (например: 'Отличная скорость, ждем в нашей команде!')"
                                            className="w-full h-32 bg-white/5 border border-white/5 rounded-[2rem] p-6 text-sm text-white placeholder:text-white/10 focus:border-sparta-gold/30 focus:outline-none transition-all resize-none"
                                        />
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setIsEvaluationModalOpen(false)}
                                        className="flex-1 py-5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white rounded-2xl font-black uppercase text-[10px] transition-all"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleSaveEvaluation}
                                        disabled={isSavingEvaluation}
                                        className="flex-[2] py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSavingEvaluation ? <Loader2 className="animate-spin" size={16} /> : 'Сохранить отчет'}
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: Enrollment Column */}
                            <div className="flex-1 bg-white/5 rounded-[3rem] border border-white/5 p-10 flex flex-col relative z-10">
                                <div className="mb-8">
                                    <h4 className="text-xl font-russo text-white uppercase flex items-center gap-3">
                                        <Users className="text-blue-400" /> Зачисление
                                    </h4>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Выберите подходящую группу</p>
                                </div>

                                <div className="flex-grow space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    {allGroups
                                        .map(group => {
                                            const age = parseInt(selectedTrialForEval.childAge || selectedTrialForEval.age) || 0;
                                            const isSuitable = group.name.includes(String(age)) ||
                                                group.description?.includes(String(age)) ||
                                                group.coachId === user?.uid;
                                            return { ...group, isSuitable };
                                        })
                                        .sort((a, b) => (b.isSuitable ? 1 : 0) - (a.isSuitable ? 1 : 0))
                                        .map(group => (
                                            <div key={group.id} className={`p-6 bg-black/40 border rounded-3xl transition-all group/item ${group.isSuitable ? 'border-sparta-gold/30 ring-1 ring-sparta-gold/10' : 'border-white/5 hover:border-white/20'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="font-russo text-white uppercase group-hover/item:text-sparta-gold transition-colors">{group.name}</h5>
                                                            {group.isSuitable && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-sparta-gold text-black text-[7px] font-black uppercase rounded-full">
                                                                    <Star size={8} fill="currentColor" /> Подходит
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <p className="text-[9px] font-black text-white/30 uppercase flex items-center gap-2">
                                                                <Users size={10} /> {group.studentCount || 0} учеников
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${group.studentCount >= 15 ? 'bg-red-500' : 'bg-green-500'}`} />
                                                                <span className="text-[8px] font-bold text-white/20 uppercase">{group.studentCount >= 15 ? 'Мест нет' : 'Есть места'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEvalAndEnroll(group.id)}
                                                        disabled={isSavingEvaluation}
                                                        className="px-6 py-3 bg-sparta-gold text-black rounded-xl font-black uppercase text-[9px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-sparta-gold/10"
                                                    >
                                                        {isSavingEvaluation ? <Loader2 size={12} className="animate-spin" /> : 'Зачислить'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                <div className="mt-8 p-6 bg-blue-400/5 border border-blue-400/20 rounded-3xl">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400">
                                            <Info size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Совет системы</p>
                                            <p className="text-[11px] text-white/60 leading-tight">
                                                На основе возраста ({selectedTrialForEval.childAge || selectedTrialForEval.age} лет) и уровня ({(() => {
                                                    const avg = Object.values(currentEvalSkills).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number / 5;
                                                    return avg > 80 ? 'Продвинутый' : avg > 50 ? 'Средний' : 'Начальный';
                                                })()}), мы подобрали лучшие варианты.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isTransferModalOpen && studentToTransfer && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#111] border border-white/10 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-2xl font-russo text-white uppercase mb-2">Перевод ученика</h3>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-8">{studentToTransfer.name}</p>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input
                                    type="text"
                                    placeholder="Поиск группы или тренера..."
                                    value={chatSearchQuery}
                                    onChange={(e) => setChatSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                                />
                            </div>

                            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {allGroups
                                    .filter(g => g.id !== selectedGroupId && (
                                        g.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                                        (g.coachName || g.coach || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
                                    ))
                                    .sort((a, b) => {
                                        const fitA = calculateGroupFit(studentToTransfer, a);
                                        const fitB = calculateGroupFit(studentToTransfer, b);
                                        return fitB - fitA;
                                    })
                                    .map(group => {
                                        const fitScore = calculateGroupFit(studentToTransfer, group);
                                        const isMine = myGroups.some(mg => mg.id === group.id);

                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleTransferStudent(group.id)}
                                                disabled={isTransferring}
                                                className={`w-full p-5 border rounded-3xl flex items-center justify-between transition-all group disabled:opacity-50
                                                    ${isMine ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                                                        ${isMine ? 'bg-orange-500/10 text-orange-500' : 'bg-white/5 text-white/20 group-hover:text-white'}`}>
                                                        <ArrowRightLeft size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{group.name}</span>
                                                            {isMine && <span className="bg-orange-500/10 text-orange-500 text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Моя группа</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Тренер: {group.coachName || group.coach || 'Не указан'}</span>
                                                            {fitScore > 70 && <span className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1"><Sparkles size={10} /> Подходит</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <ChevronRight size={18} className="text-white/10" />
                                                    <span className="text-[8px] font-black text-white/10 uppercase">{fitScore}% Fit</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                {allGroups.filter(g => g.id !== selectedGroupId).length === 0 && (
                                    <div className="text-center py-10 opacity-20">
                                        <ArrowRightLeft size={48} className="mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">Нет доступных групп</p>
                                    </div>
                                )}
                            </div>
                            <Button onClick={() => setIsTransferModalOpen(false)} variant="outline" className="w-full py-4 rounded-2xl border-white/10 text-white/40 hover:text-white transition-all">ОТМЕНА</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEnrollModalOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#111] border border-white/10 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-2xl font-russo text-white uppercase mb-2">Р—ачисление</h3>
                            <p className="text-sparta-gold text-[10px] font-black uppercase tracking-widest mb-8">{selectedTrialRequest?.name}</p>
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input
                                    type="text"
                                    placeholder="Поиск группы автономном режиме..."
                                    value={exerciseSearchQuery}
                                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-sparta-gold/50 transition-all"
                                />
                            </div>

                            <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {allGroups
                                    .filter(g => g.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) || (g.coachName || g.coach || '').toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
                                    .sort((a, b) => {
                                        const fitA = calculateGroupFit(selectedTrialRequest, a);
                                        const fitB = calculateGroupFit(selectedTrialRequest, b);
                                        return fitB - fitA;
                                    })
                                    .map(group => {
                                        const fitScore = calculateGroupFit(selectedTrialRequest, group);
                                        const isMine = myGroups.some(mg => mg.id === group.id);

                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleEnrollTrial(group.id)}
                                                className={`w-full p-5 border rounded-3xl flex items-center justify-between transition-all group
                                                    ${isMine ? 'bg-sparta-gold/5 border-sparta-gold/20 hover:border-sparta-gold' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                                                        ${isMine ? 'bg-sparta-gold/10 text-sparta-gold' : 'bg-white/5 text-white/20 group-hover:text-white'}`}>
                                                        <Users size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white group-hover:text-sparta-gold transition-colors">{group.name}</span>
                                                            {isMine && <span className="bg-sparta-gold/10 text-sparta-gold text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Моя группа</span>}
                                                        </div>
                                                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Тренер: {group.coachName || group.coach || 'Не указан'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <ChevronRight size={18} className="text-white/10" />
                                                    {fitScore > 0 && <span className="text-[8px] font-black text-white/20 uppercase">{fitScore}% Fit</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                            <Button onClick={() => setIsEnrollModalOpen(false)} variant="outline" className="w-full py-4 rounded-2xl border-white/10 text-white/40 hover:text-white transition-all">ОТМЕНА</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dynamic Student Profile Modal */}
            <StudentProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                student={selectedStudentForProfile}
                attendanceStats={selectedStudentForProfile ? (studentAttendanceStats[selectedStudentForProfile.id] || studentProfileStats) : undefined}
                onContactParent={handleContactParent}
                onTogglePayment={handleTogglePayment}
            />
            <AnimatePresence>
                {isGuideOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#111] border border-white/10 rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl" />
                            <button onClick={() => setIsGuideOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><X size={24} /></button>

                            <h3 className="text-3xl font-russo text-white uppercase mb-8">Как пользоваться панелью</h3>

                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center shrink-0"><Zap size={24} /></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase mb-2">Ваши приоритеты</h4>
                                        <p className="text-[11px] text-white/40 leading-relaxed uppercase font-black tracking-widest">В самом верху вы видите «Приоритеты на сегодня». Система сама находит данные, новые заявки и сообщения от родителей. Начните работу с этого блока.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Users size={24} /></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase mb-2">Управление составом</h4>
                                        <p className="text-[11px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Инструкции над списком учеников. Наведите на иконку (i) рядом с фильтром, чтобы понять, какие именно группы туда попадают.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0"><RefreshCw size={24} /></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase mb-2">Синхронизация</h4>
                                        <p className="text-[11px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Если у ученика есть статус «В базе», значит он уже занесен в клубную базу. Нажмите кнопку «Синхронизировать», чтобы привязать его данные к личному кабинету.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center shrink-0"><ArrowRightLeft size={24} /></div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase mb-2">Перевод учеников</h4>
                                        <p className="text-[11px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Чтобы перевести ученика в другую группу, нажмите иконку стрелок в строке ученика. Система сама предложит подходящие группы по возрасту.</p>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={() => setIsGuideOpen(false)} className="w-full mt-10 py-5 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-widest text-xs">ПОНЯТНО, ПОЕХАЛИ!</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isExerciseModalOpen && (
                    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-start p-4 md:p-8 bg-black/95 backdrop-blur-3xl overflow-y-auto custom-scrollbar">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            className="bg-[#0a0a0a]/80 backdrop-blur-[50px] border border-white/10 rounded-[3rem] p-8 md:p-12 max-w-4xl w-full shadow-2xl relative my-8 md:my-16"
                        >
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-sparta-gold/10 rounded-full blur-3xl" />

                            {/* Step Indicator */}
                            <div className="flex items-center gap-4 mb-12 relative z-10 px-2">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-center gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-russo text-sm transition-all duration-500 ${currentExerciseStep === step
                                                ? 'bg-sparta-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-110'
                                                : currentExerciseStep > step
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-white/5 text-white/20'
                                            }`}>
                                            {currentExerciseStep > step ? <CheckCircle size={20} /> : step}
                                        </div>
                                        {step < 3 && <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${currentExerciseStep > step ? 'bg-green-500' : 'bg-white/5'}`} />}
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-3xl font-russo text-white uppercase mb-8 flex items-center gap-4 relative z-10">
                                {editingExercise ? 'Редактирование' : 'Новое упражнение'}
                                <span className="text-sparta-gold text-sm opacity-40 font-black">— Шаг {currentExerciseStep} из 3</span>
                            </h3>

                            <div className="space-y-8 relative z-10">
                                {currentExerciseStep === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Название упражнения</label>
                                                <button
                                                    onClick={handleAIGenerateExercise}
                                                    disabled={!newExerciseData.title || isGeneratingAI}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!newExerciseData.title
                                                            ? 'opacity-20 cursor-not-allowed'
                                                            : isGeneratingAI
                                                                ? 'bg-sparta-gold/20 text-sparta-gold animate-pulse'
                                                                : 'bg-sparta-gold/10 text-sparta-gold hover:bg-sparta-gold hover:text-black cursor-magic'
                                                        }`}
                                                >
                                                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {isGeneratingAI ? 'Анализ...' : 'Magic Wand'}
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={newExerciseData.title}
                                                onChange={(e) => setNewExerciseData({ ...newExerciseData, title: e.target.value })}
                                                placeholder="Напр: Дриблинг 'змейка'..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-sparta-gold/30 outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Описание и техника выполнения</label>
                                            <textarea
                                                rows={4}
                                                value={newExerciseData.description}
                                                onChange={(e) => setNewExerciseData({ ...newExerciseData, description: e.target.value })}
                                                placeholder="Опишите детали как выполнять упражнение..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-sparta-gold/30 outline-none transition-all resize-none shadow-inner"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Категория</label>
                                                <select
                                                    value={newExerciseData.category}
                                                    onChange={(e) => setNewExerciseData({ ...newExerciseData, category: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-sparta-gold/30 outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    {EXERCISE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                                        <option key={cat.id} value={cat.id} className="bg-[#0a0a0a]">{cat.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Сложность</label>
                                                <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                                                    {[
                                                        { id: 'beginner', label: 'EASY', color: 'text-green-400' },
                                                        { id: 'intermediate', label: 'MED', color: 'text-sparta-gold' },
                                                        { id: 'advanced', label: 'PRO', color: 'text-red-400' }
                                                    ].map(l => (
                                                        <button
                                                            key={l.id}
                                                            onClick={() => setNewExerciseData({ ...newExerciseData, level: l.id as any })}
                                                            className={`py-3 rounded-xl text-[9px] font-black transition-all ${newExerciseData.level === l.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                                                        >
                                                            {l.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {currentExerciseStep === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center">
                                            <h4 className="text-sm font-russo uppercase mb-4">Медиа-материалы</h4>

                                            <div className="flex gap-4 mb-8 p-1 bg-black/40 rounded-2xl border border-white/5">
                                                <button
                                                    onClick={() => setNewExerciseData({ ...newExerciseData, mediaType: 'url' })}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newExerciseData.mediaType === 'url' ? 'bg-sparta-gold text-black' : 'text-white/20'}`}
                                                >
                                                    YouTube Ссылка
                                                </button>
                                                <button
                                                    onClick={() => setNewExerciseData({ ...newExerciseData, mediaType: 'video' })}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newExerciseData.mediaType === 'video' || newExerciseData.mediaType === 'photo' ? 'bg-sparta-gold text-black' : 'text-white/20'}`}
                                                >
                                                    Загрузить файл
                                                </button>
                                            </div>

                                            {newExerciseData.mediaType === 'url' ? (
                                                <input
                                                    type="url"
                                                    value={newExerciseData.videoUrl}
                                                    onChange={(e) => setNewExerciseData({ ...newExerciseData, videoUrl: e.target.value })}
                                                    placeholder="Вставьте ссылку на YouTube видео..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-sparta-gold/30 outline-none transition-all shadow-inner"
                                                />
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-4 gap-4">
                                                        {newExerciseData.mediaItems.map((item) => (
                                                            <div key={item.id} className="aspect-square rounded-2xl bg-white/5 border border-white/10 relative group overflow-hidden shadow-2xl">
                                                                <img src={item.url} className="w-full h-full object-cover" />

                                                                {/* Angle Overlays */}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2">
                                                                    <div className="grid grid-cols-2 gap-1 mb-6">
                                                                        {['front', 'side', 'back', 'top'].map(angle => (
                                                                            <button
                                                                                key={angle}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    const updated = newExerciseData.mediaItems.map(mi =>
                                                                                        mi.id === item.id ? { ...mi, angle } : mi
                                                                                    );
                                                                                    setNewExerciseData({ ...newExerciseData, mediaItems: updated });
                                                                                }}
                                                                                className={`py-1.5 rounded-lg text-[6px] font-black uppercase transition-all border ${item.angle === angle
                                                                                        ? 'bg-sparta-gold text-black border-sparta-gold'
                                                                                        : 'bg-black/80 text-white/40 border-white/10 hover:border-white/40 hover:text-white'
                                                                                    }`}
                                                                            >
                                                                                {angle}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Angle Tag Badge */}
                                                                {item.angle && (
                                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-sparta-gold text-black rounded-lg text-[7px] font-black uppercase shadow-lg">
                                                                        {item.angle}
                                                                    </div>
                                                                )}

                                                                <button
                                                                    onClick={() => handleRemoveMediaItem(item.id)}
                                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg z-10"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-sparta-gold/30 hover:bg-sparta-gold/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group shadow-inner">
                                                            <Plus size={24} className="text-white/10 group-hover:text-sparta-gold/50" />
                                                            <span className="text-[8px] font-black text-white/20 uppercase">Добавить</span>
                                                            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                const newItems = files.map((f: any) => ({
                                                                    id: `new-${Date.now()}-${Math.random()}`,
                                                                    file: f,
                                                                    url: URL.createObjectURL(f),
                                                                    type: (f.type.startsWith('video/') ? 'video' : 'photo') as any,
                                                                    angle: ''
                                                                }));
                                                                setNewExerciseData({
                                                                    ...newExerciseData,
                                                                    mediaItems: [...newExerciseData.mediaItems, ...newItems]
                                                                });
                                                            }} />
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {currentExerciseStep === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-end">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Анатомия упражнения</label>
                                                <span className="text-[9px] font-black text-sparta-gold uppercase bg-sparta-gold/10 px-3 py-1 rounded-lg">
                                                    {newExerciseData.muscles.length} групп выбрано
                                                </span>
                                            </div>

                                            <div className="flex flex-col lg:flex-row gap-8 items-center bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                                                {/* Human Silhouette SVG Map */}
                                                <div className="w-56 h-[320px] relative flex-shrink-0 bg-black/40 rounded-3xl p-4 border border-white/5 shadow-inner">
                                                    <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-[0_0_10px_rgba(212,175,55,0.1)]">
                                                        <defs>
                                                            <filter id="glow">
                                                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                                <feMerge>
                                                                    <feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" />
                                                                </feMerge>
                                                            </filter>
                                                        </defs>
                                                        {/* Silhouette background */}
                                                        <path d="M50 10 c5 0 10 5 10 10 s-5 10 -10 10 s-10 -5 -10 -10 s5 -10 10 -10" fill="#222" />
                                                        <rect x="35" y="30" width="30" height="50" rx="10" fill="#222" />
                                                        <rect x="25" y="35" width="10" height="40" rx="5" fill="#222" />
                                                        <rect x="65" y="35" width="10" height="40" rx="5" fill="#222" />
                                                        <rect x="35" y="80" width="12" height="60" rx="6" fill="#222" />
                                                        <rect x="53" y="80" width="12" height="60" rx="6" fill="#222" />

                                                        {/* Interactive Zones */}
                                                        {/* Chest */}
                                                        <path
                                                            d="M38 40 h24 a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h-24 a5 5 0 0 1 -5 -5 v-10 a5 5 0 0 1 5 -5"
                                                            className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('chest') ? 'fill-sparta-gold filter-glow' : 'fill-white/10 hover:fill-white/20'}`}
                                                            onClick={() => {
                                                                const exists = newExerciseData.muscles.includes('chest');
                                                                setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'chest') : [...newExerciseData.muscles, 'chest'] });
                                                            }}
                                                            filter={newExerciseData.muscles.includes('chest') ? 'url(#glow)' : ''}
                                                        />
                                                        {/* Core */}
                                                        <rect
                                                            x="40" y="58" width="20" height="18" rx="4"
                                                            className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('core') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`}
                                                            onClick={() => {
                                                                const exists = newExerciseData.muscles.includes('core');
                                                                setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'core') : [...newExerciseData.muscles, 'core'] });
                                                            }}
                                                        />
                                                        {/* Shoulders */}
                                                        <circle cx="28" cy="38" r="6" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('shoulders') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('shoulders');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'shoulders') : [...newExerciseData.muscles, 'shoulders'] });
                                                        }} />
                                                        <circle cx="72" cy="38" r="6" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('shoulders') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('shoulders');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'shoulders') : [...newExerciseData.muscles, 'shoulders'] });
                                                        }} />
                                                        {/* Arms (Bicep/Tricep) */}
                                                        <rect x="23" y="47" width="8" height="20" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('biceps') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('biceps');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'biceps') : [...newExerciseData.muscles, 'biceps'] });
                                                        }} />
                                                        <rect x="69" y="47" width="8" height="20" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('biceps') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('biceps');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'biceps') : [...newExerciseData.muscles, 'biceps'] });
                                                        }} />
                                                        {/* Legs (Quads) */}
                                                        <rect x="36" y="85" width="11" height="30" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('quads') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('quads');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'quads') : [...newExerciseData.muscles, 'quads'] });
                                                        }} />
                                                        <rect x="53" y="85" width="11" height="30" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('quads') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('quads');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'quads') : [...newExerciseData.muscles, 'quads'] });
                                                        }} />
                                                        {/* Calves */}
                                                        <rect x="38" y="120" width="8" height="25" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('calves') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('calves');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'calves') : [...newExerciseData.muscles, 'calves'] });
                                                        }} />
                                                        <rect x="54" y="120" width="8" height="25" rx="4" className={`cursor-pointer transition-all duration-300 ${newExerciseData.muscles.includes('calves') ? 'fill-sparta-gold' : 'fill-white/10 hover:fill-white/20'}`} onClick={() => {
                                                            const exists = newExerciseData.muscles.includes('calves');
                                                            setNewExerciseData({ ...newExerciseData, muscles: exists ? newExerciseData.muscles.filter(m => m !== 'calves') : [...newExerciseData.muscles, 'calves'] });
                                                        }} />
                                                    </svg>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                                </div>

                                                {/* Textual Selector (Alternative/Details) */}
                                                <div className="flex-1 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {MUSCLE_GROUPS.map(muscle => (
                                                            <button
                                                                key={muscle.id}
                                                                onClick={() => {
                                                                    const exists = newExerciseData.muscles.includes(muscle.id);
                                                                    setNewExerciseData({
                                                                        ...newExerciseData,
                                                                        muscles: exists
                                                                            ? newExerciseData.muscles.filter(m => m !== muscle.id)
                                                                            : [...newExerciseData.muscles, muscle.id]
                                                                    });
                                                                }}
                                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${newExerciseData.muscles.includes(muscle.id)
                                                                        ? 'bg-sparta-gold/10 border-sparta-gold text-sparta-gold'
                                                                        : 'bg-white/5 border-white/5 text-white/20 hover:border-white/10 hover:text-white/40'
                                                                    }`}
                                                            >
                                                                <span className="text-xl">{muscle.icon}</span>
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase tracking-widest">{muscle.label}</div>
                                                                    <div className="text-[8px] font-bold opacity-40 uppercase">Группа мышц</div>
                                                                </div>
                                                                {newExerciseData.muscles.includes(muscle.id) && <CheckCircle size={14} className="ml-auto" />}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => setNewExerciseData({ ...newExerciseData, muscles: [] })}
                                                        className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-white/10 hover:text-red-400 transition-all border border-dashed border-white/5 hover:border-red-400/20 rounded-xl"
                                                    >
                                                        Сбросить выбор
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Выбор коллекции</label>
                                                {newExerciseData.collectionId !== 'all' && (
                                                    <span className="text-[9px] font-black text-purple-400 uppercase">Закреплено в папке</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setNewExerciseData({ ...newExerciseData, collectionId: 'all' })}
                                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newExerciseData.collectionId === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}
                                                >
                                                    Без папки
                                                </button>
                                                {exerciseCollections.map(col => (
                                                    <button
                                                        key={col.id}
                                                        onClick={() => setNewExerciseData({ ...newExerciseData, collectionId: col.id })}
                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${newExerciseData.collectionId === col.id
                                                                ? 'bg-white/10 text-white'
                                                                : 'bg-white/5 text-white/20 border-transparent hover:border-white/10'
                                                            }`}
                                                        style={{ borderColor: newExerciseData.collectionId === col.id ? col.color : 'transparent', color: newExerciseData.collectionId === col.id ? col.color : 'inherit' }}
                                                    >
                                                        {col.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Bottom Navigation */}
                            <div className="flex gap-4 pt-12 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentExerciseStep > 1) {
                                            setCurrentExerciseStep(currentExerciseStep - 1);
                                        } else {
                                            setIsExerciseModalOpen(false);
                                            setEditingExercise(null);
                                            setCurrentExerciseStep(1);
                                            setNewExerciseData({
                                                title: '', description: '', category: 'technique',
                                                level: 'beginner', equipment: [], muscles: [], usageCount: 0, collectionId: 'all',
                                                videoUrl: '', mediaType: 'url', mediaItems: []
                                            });
                                        }
                                    }}
                                    className="px-10 py-5 bg-white/5 text-white hover:bg-white/10 font-black uppercase text-[11px] rounded-2xl transition-all border border-white/10"
                                >
                                    {currentExerciseStep === 1 ? 'ОТМЕНА' : 'НАЗАД'}
                                </button>

                                {currentExerciseStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentExerciseStep(currentExerciseStep + 1)}
                                        disabled={!newExerciseData.title.trim() && currentExerciseStep === 1}
                                        className={`flex-1 py-5 font-black uppercase text-[11px] rounded-2xl transition-all shadow-xl shadow-sparta-gold/20 flex items-center justify-center gap-3
                                            ${(!newExerciseData.title.trim() && currentExerciseStep === 1)
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                : 'bg-sparta-gold text-black hover:bg-white active:scale-95'}`}
                                    >
                                        ДАЛЕЕ
                                        <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSaveExercise}
                                        disabled={isSavingExercise || !newExerciseData.title.trim()}
                                        className={`flex-1 py-5 font-black uppercase text-[11px] rounded-2xl transition-all shadow-xl shadow-sparta-gold/20 flex items-center justify-center gap-3
                                            ${(isSavingExercise || !newExerciseData.title.trim())
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                : 'bg-sparta-gold text-black hover:bg-white active:scale-95'}`}
                                    >
                                        {isSavingExercise && <Loader2 size={18} className="animate-spin" />}
                                        {isSavingExercise ? 'СОХРАНЕНИЕ...' : editingExercise ? 'ОБНОВИТЬ EX' : 'СОЗДАТЬ EX'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isTemplateModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0a0a0a]/80 backdrop-blur-[50px] border border-white/10 rounded-[4rem] p-12 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                            <h3 className="text-3xl font-russo text-white uppercase mb-8 flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400"><Layers size={24} /></div>
                                <span>Конструктор Программы</span>
                            </h3>
                            <div className="space-y-6 relative z-10">
                                <input
                                    type="text"
                                    value={newTemplateData.title}
                                    onChange={(e) => setNewTemplateData({ ...newTemplateData, title: e.target.value })}
                                    placeholder="Название программы (например: Базовая интенсивная)"
                                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-5 text-sm text-white focus:border-purple-500/30 outline-none transition-all font-bold"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Тип программы</label>
                                        <select
                                            value={newTemplateData.category}
                                            onChange={(e) => setNewTemplateData({ ...newTemplateData, category: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-purple-500/30 transition-all font-bold"
                                        >
                                            <option value="technique">ТЕХНИКА</option>
                                            <option value="strength">СИЛОВАЯ</option>
                                            <option value="sparring">СПАРРИНГИ</option>
                                            <option value="pro">ПРОФЕССИОНАЛЬНАЯ</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Инструкция (Интенсивность)</label>
                                        <select
                                            value={newTemplateData.intensity}
                                            onChange={(e) => setNewTemplateData({ ...newTemplateData, intensity: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-purple-500/30 transition-all font-bold"
                                        >
                                            <option value="low">НИЗКАЯ (ВОССТАНОВЛЕНИЕ)</option>
                                            <option value="medium">СРЕДНЯЯ (БАЛАНС)</option>
                                            <option value="high">ВЫСОКАЯ (ХАРДКОР)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between ml-1">
                                        <div className="flex flex-col">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Медиа-хаб программы</label>
                                            <span className="text-[7px] text-white/10 uppercase font-bold mt-1">Добавьте фото обложки и галерею</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowTemplateUrlInput(!showTemplateUrlInput)}
                                                className={`p-2 rounded-lg transition-all ${showTemplateUrlInput ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                title="Вставить ссылку"
                                            >
                                                <LinkIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => document.getElementById('template-media-input')?.click()}
                                                disabled={isUploadingCover}
                                                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-[8px] font-black text-purple-400 uppercase rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isUploadingCover ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                                {isUploadingCover ? 'Загрузка...' : 'Добавить фото'}
                                            </button>
                                            <input
                                                id="template-media-input"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => e.target.files && handleTemplateMediaFiles(e.target.files)}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Smart URL Input */}
                                    <AnimatePresence>
                                        {showTemplateUrlInput && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="relative group/input overflow-hidden"
                                            >
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={newTemplateData.coverImage}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNewTemplateData({ ...newTemplateData, coverImage: val });
                                                        // Smart auto-hide: if it looks like a full URL, hide it after a moment
                                                        if (val.length > 10 && (val.startsWith('http') || val.includes('.'))) {
                                                            setTimeout(() => setShowTemplateUrlInput(false), 1500);
                                                        }
                                                    }}
                                                    placeholder="Вставьте ссылку на фото..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-10 pr-10 text-[9px] text-white focus:text-white focus:border-purple-500/30 outline-none transition-all font-bold"
                                                />
                                                <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                                                {newTemplateData.coverImage && (
                                                    <button
                                                        onClick={() => setNewTemplateData({ ...newTemplateData, coverImage: '' })}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-400 p-1"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* persistent Drop Zone (Invite state) */}
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingToTemplate(true);
                                        }}
                                        onDragLeave={() => setIsDraggingToTemplate(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (e.dataTransfer.files) handleTemplateMediaFiles(e.dataTransfer.files);
                                        }}
                                        className={`relative h-[120px] rounded-[2rem] border-2 border-dashed transition-all overflow-hidden group/drop flex flex-col items-center justify-center gap-2
                                            ${isDraggingToTemplate
                                                ? 'bg-purple-500/20 border-purple-500 scale-[0.98] ring-4 ring-purple-500/10'
                                                : 'bg-white/5 border-white/10 hover:border-white/20 text-white/20'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover/drop:scale-110 group-hover/drop:bg-purple-500/10 group-hover/drop:border-purple-500/20 transition-all">
                                            <ImageIcon size={20} />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest">{isDraggingToTemplate ? 'Бросайте сюда!' : 'Закиньте фото сюда'}</span>
                                            <span className="text-[7px] font-bold uppercase opacity-50">поддерживается drag & drop</span>
                                        </div>
                                    </div>

                                    {/* Active Preview & Gallery */}
                                    <AnimatePresence>
                                        {(newTemplateData.coverImage || newTemplateData.gallery.length > 0) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="space-y-4"
                                            >
                                                {newTemplateData.coverImage && (
                                                    <div
                                                        className="relative aspect-[21/9] rounded-[2rem] overflow-hidden group/main cursor-pointer border-2 border-transparent hover:border-purple-500/50 transition-all shadow-2xl"
                                                    >
                                                        <img
                                                            src={newTemplateData.coverImage}
                                                            onClick={() => handleOpenTemplateLightbox(newTemplateData.coverImage)}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/main:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none p-6 flex flex-col justify-end">
                                                            <div className="flex items-center justify-between pointer-events-auto">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Основная обложка</span>
                                                                    <span className="text-[10px] font-bold text-white uppercase">{newTemplateData.title || 'Программа'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleOpenTemplateLightbox(newTemplateData.coverImage)}
                                                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/10 flex items-center gap-2 group/zoom"
                                                                    >
                                                                        <Maximize2 size={16} className="group-hover/zoom:scale-110 transition-transform" />
                                                                        <span className="text-[8px] font-black uppercase">Просмотр</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowTemplateUrlInput(!showTemplateUrlInput)}
                                                                        className={`p-3 rounded-2xl backdrop-blur-md transition-all border border-white/10 flex items-center gap-2 group/link ${showTemplateUrlInput ? 'bg-purple-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                                                    >
                                                                        <LinkIcon size={16} />
                                                                        <span className="text-[8px] font-black uppercase">Ссылка</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewTemplateData(prev => ({ ...prev, coverImage: '' }));
                                                                        }}
                                                                        className="p-3 bg-red-500/10 hover:bg-red-500 text-white rounded-2xl transition-all border border-red-500/20"
                                                                    >
                                                                        <TrashIcon size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {newTemplateData.gallery.length > 0 && (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {newTemplateData.gallery.map((url, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative aspect-square rounded-xl overflow-hidden group/thumb border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    onClick={() => handleOpenTemplateLightbox(url)}
                                                                    className="w-full h-full object-cover opacity-60 group-hover/thumb:opacity-100 transition-opacity"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                                    <div className="flex gap-1.5">
                                                                        <button
                                                                            onClick={() => handleOpenTemplateLightbox(url)}
                                                                            className="p-1.5 bg-white/20 hover:bg-white text-black rounded-lg transition-all"
                                                                        >
                                                                            <Maximize2 size={10} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setShowTemplateUrlInput(!showTemplateUrlInput)}
                                                                            className={`p-1.5 rounded-lg transition-all ${showTemplateUrlInput ? 'bg-purple-500 text-white' : 'bg-white/20 text-white hover:bg-purple-500'}`}
                                                                        >
                                                                            <LinkIcon size={10} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex gap-1.5">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setNewTemplateData(prev => ({ ...prev, coverImage: url }));
                                                                            }}
                                                                            className={`p-1.5 rounded-lg transition-all ${newTemplateData.coverImage === url ? 'bg-purple-500 text-white' : 'bg-white/10 text-white hover:bg-purple-500'}`}
                                                                        >
                                                                            <Star size={10} fill={newTemplateData.coverImage === url ? "currentColor" : "none"} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRemoveGalleryImage(url);
                                                                            }}
                                                                            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg transition-all"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
                                                Настройка блоков программы
                                            </label>
                                            <div className="flex items-center gap-2 text-[8px] font-bold text-purple-400 uppercase bg-purple-500/10 px-3 py-1 rounded-lg">
                                                <Info size={10} />
                                                <span>Выберите этап и добавьте упражнения</span>
                                            </div>
                                        </div>

                                        {/* Stage Selector Tabs */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['warmup', 'main', 'skills', 'cooldown'] as const).map(stage => (
                                                <button
                                                    key={stage}
                                                    onClick={() => setActiveConstructorStage(stage)}
                                                    className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all border ${activeConstructorStage === stage
                                                            ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                            : 'bg-white/5 border-white/5 text-white/20 hover:border-white/10'
                                                        }`}
                                                >
                                                    {stage === 'warmup' ? 'РАЗМИНКА' :
                                                        stage === 'main' ? 'ОСНОВА' :
                                                            stage === 'skills' ? 'НАВЫКИ' : 'ЗАМИНКА'}
                                                    <div className="mt-1 opacity-40">({newTemplateData.stages[stage].length})</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Search Field */}
                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                        <input
                                            type="text"
                                            value={programExerciseSearch}
                                            onChange={(e) => setProgramExerciseSearch(e.target.value)}
                                            placeholder="Поиск упражнения..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-[10px] text-white focus:border-purple-500/30 outline-none transition-all font-bold placeholder:text-white/10"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {exercises
                                            .filter(ex => ex.title.toLowerCase().includes(programExerciseSearch.toLowerCase()))
                                            .map(ex => {
                                                const isSelected = newTemplateData.stages[activeConstructorStage].includes(ex.id);
                                                return (
                                                    <button
                                                        key={ex.id}
                                                        onClick={() => {
                                                            setNewTemplateData(prev => {
                                                                const currentStage = prev.stages[activeConstructorStage];
                                                                const newStage = isSelected
                                                                    ? currentStage.filter(id => id !== ex.id)
                                                                    : [...currentStage, ex.id];

                                                                return {
                                                                    ...prev,
                                                                    stages: {
                                                                        ...prev.stages,
                                                                        [activeConstructorStage]: newStage
                                                                    }
                                                                };
                                                            });
                                                        }}
                                                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all group/item
                                                            ${isSelected
                                                                ? 'bg-purple-500/20 border-purple-500 text-white font-bold ring-1 ring-purple-500/50'
                                                                : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'}`}
                                                    >
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase truncate pr-2">{ex.title}</span>
                                                            <span className="text-[7px] text-white/20 font-black uppercase mt-1">
                                                                {ex.category === 'technique' ? 'Тех' : 'Физ'}
                                                            </span>
                                                        </div>
                                                        {isSelected ? (
                                                            <CheckCircle size={14} className="text-purple-400 shrink-0" />
                                                        ) : (
                                                            <Plus size={14} className="text-white/10 group-hover/item:text-white/40 shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <Button onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-5 bg-white/5 text-white hover:bg-white/10 font-black uppercase text-xs">ОТМЕНА</Button>
                                    <button
                                        onClick={async () => {
                                            if (!newTemplateData.title.trim()) return;
                                            setIsSavingTemplate(true);
                                            try {
                                                const finalData = {
                                                    ...newTemplateData,
                                                    exercises: selectedExercisesForTemplate,
                                                    coachId: userProfile.coachId,
                                                    updatedAt: serverTimestamp()
                                                };

                                                if (editingTemplate) {
                                                    await updateDoc(doc(db, "training_templates", editingTemplate.id), finalData);
                                                } else {
                                                    (finalData as any).createdAt = serverTimestamp();
                                                    await addDoc(collection(db, "training_templates"), finalData);
                                                }

                                                setIsTemplateModalOpen(false);
                                                setEditingTemplate(null);
                                                setNewTemplateData({
                                                    title: '',
                                                    description: '',
                                                    intensity: 'medium',
                                                    duration: '4',
                                                    category: 'technique',
                                                    stages: { warmup: [], main: [], skills: [], cooldown: [] },
                                                    coverImage: '',
                                                    gallery: [],
                                                    intensityCurve: [30, 50, 80, 45]
                                                });
                                                setSelectedExercisesForTemplate([]);
                                            } catch (err) { console.error(err); }
                                            setIsSavingTemplate(false);
                                        }}
                                        disabled={isSavingTemplate || !newTemplateData.title || (Object.values(newTemplateData.stages).flat().length === 0)}
                                        className={`flex-1 py-5 font-black uppercase text-xs rounded-2xl transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2
                                            ${(isSavingTemplate || !newTemplateData.title || (Object.values(newTemplateData.stages).flat().length === 0))
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5 shadow-none'
                                                : 'bg-purple-500 text-white hover:bg-white hover:text-black active:scale-95'}`}
                                    >
                                        {isSavingTemplate && <Loader2 size={16} className="animate-spin" />}
                                        {isSavingTemplate ? 'СОХРАНЕНИЕ...' : editingTemplate ? 'ОБНОВИТЬ ПРОГРАММУ' : 'СОЗДАТЬ ШАБЛОН'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* CLEAN DEDICATED ASSIGNMENT MODAL */}
            <AssignmentModal
                isOpen={isAssignmentModalOpen}
                onClose={() => {
                    setIsAssignmentModalOpen(false);
                    setAssigningItem(null);
                    setEditingAssignmentTask(null);
                }}
                initialData={editingAssignmentTask}
                student={editingAssignmentTask ? null : (assigningItem?.targetStudent || (assignmentTargetType === 'student' ? (groupStudents.find(s => s.id === assignmentTargetStudentId) || myStudents.find(s => s.id === assignmentTargetStudentId)) : null))}
                currentGroup={myGroups.find(g => g.id === (editingAssignmentTask?.groupId || selectedAssignmentTarget || selectedGroupId)) || myGroups[0] || null}
                groupStudents={groupStudents}
                coachId={userProfile?.coachId || user?.uid || ''}
                coachName={coachDisplayName || 'Тренер'}
                onSuccess={(newTask) => {
                    setHomeworkTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
                }}
            />
            <AnimatePresence>
                {isExerciseGuideOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 max-w-3xl w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-sparta-gold/5 rounded-full blur-3xl" />
                            <button onClick={() => setIsExerciseGuideOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><X size={24} /></button>

                            <h3 className="text-4xl font-russo text-white uppercase mb-4">Elite Coaching Guide</h3>
                            <p className="text-sparta-gold text-[10px] font-black uppercase tracking-widest mb-12 opacity-60">Как организовать учебный процесс на максимум</p>

                            <div className="grid grid-cols-2 gap-8 mb-12">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center"><FolderOpen size={20} /></div>
                                    <h4 className="text-sm font-bold text-white uppercase">Коллекции (Папки)</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Группируйте упражнения по темам: В«Р—ащита», В«Атака», В«U10В». Это позволит быстро находить нужный материал при создании программ.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center"><VideoIcon size={20} /></div>
                                    <h4 className="text-sm font-bold text-white uppercase">Медиа-материалы</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Вы можете загружать видео напрямую или вставлять ссылки с YouTube. Прямая загрузка удобна для работы с базой видео в автономном режиме.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center"><TrendingUp size={20} /></div>
                                    <h4 className="text-sm font-bold text-white uppercase">Статистика Внедрения</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Индикация активности на карточке показывает, сколько раз упражнение было назначено группам. Следите за разнообразием тренировок.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center"><MousePointer2 size={20} /></div>
                                    <h4 className="text-sm font-bold text-white uppercase">Hover-Preview</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed uppercase font-black tracking-widest">Просто наведите на карточку упражнения, чтобы увидеть видео-превью. Не нужно открывать каждое видео по отдельности.</p>
                                </div>
                            </div>

                            <Button onClick={() => setIsExerciseGuideOpen(false)} className="w-full py-6 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-sparta-gold/20">ВСЁ РЇРЎРќРћ, СПАСИБО!</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* SPARTA PLAYER (LIGHTBOX) */}
            <AnimatePresence>
                {selectedProgramForPreview && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card glass-panel border border-white/10 rounded-[4rem] p-12 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl"
                        >
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <h3 className="text-3xl font-russo text-white uppercase mb-2 tracking-tight">{selectedProgramForPreview.title}</h3>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-[8px] font-black uppercase tracking-widest">{selectedProgramForPreview.category || 'Техника'}</span>
                                        <span className="px-3 py-1 bg-white/5 text-white/30 rounded-lg text-[8px] font-black uppercase tracking-widest">{selectedProgramForPreview.duration || 4} Недели</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedProgramForPreview(null)}
                                    className="p-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 relative z-10">
                                <p className="text-sm text-white/40 leading-relaxed mb-8">{selectedProgramForPreview.description || 'Нет описания для этой программы.'}</p>

                                <div className="space-y-8">
                                    {(['warmup', 'main', 'skills', 'cooldown'] as const).map(stageKey => {
                                        // Compatibility: if stages exist, use them. 
                                        // If not, and it's the 'main' stage, use the legacy exercises array.
                                        const exerciseIds = selectedProgramForPreview.stages?.[stageKey] ||
                                            (stageKey === 'main' ? selectedProgramForPreview.exercises : []) || [];

                                        if (exerciseIds.length === 0) return null;

                                        const stageLabel = stageKey === 'warmup' ? 'Разминка' :
                                            stageKey === 'main' ? 'Основной блок' :
                                                stageKey === 'skills' ? 'Навыки' : 'Заминка';

                                        return (
                                            <div key={stageKey}>
                                                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {stageLabel}:
                                                </h4>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {exerciseIds.map((exId: string, idx: number) => {
                                                        const ex = exercises.find(e => e.id === exId);
                                                        return (
                                                            <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center gap-4 group hover:bg-white/[0.07] transition-all">
                                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-russo text-xs">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-white uppercase tracking-tight">{ex?.title || 'Упражнение удалено'}</p>
                                                                    <p className="text-[9px] text-white/20 font-black uppercase mt-0.5">{ex?.category || 'Тренировка'}</p>
                                                                </div>
                                                                {ex?.mediaType === 'video' || ex?.mediaType === 'url' ? (
                                                                    <div className="text-purple-500/30 group-hover:text-purple-500 transition-colors">
                                                                        <Play size={16} />
                                                                    </div>
                                                                ) : <div className="text-white/5"><Camera size={16} /></div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-8 mt-8 border-t border-white/5 relative z-10 flex gap-4">
                                <button
                                    onClick={() => {
                                        handleOpenAssignmentModal(selectedProgramForPreview, 'program');
                                        setSelectedProgramForPreview(null);
                                    }}
                                    className="flex-1 py-5 bg-purple-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-purple-500/20 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3"
                                >
                                    <ArrowRightLeft size={18} />
                                    <span>В РАСПИСАНИЕ</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedMediaForLightbox && (
                    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-6xl aspect-video bg-[#0a0a0a] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
                        >
                            {/* Player Header */}
                            <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                                <div>
                                    <h3 className="text-2xl font-russo text-white uppercase tracking-tight">{selectedMediaForLightbox.title}</h3>
                                    <p className="text-sparta-gold text-[10px] font-black uppercase tracking-widest mt-1">
                                        Материал {selectedMediaForLightbox.currentIndex + 1} из {selectedMediaForLightbox.items.length}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedMediaForLightbox(null)}
                                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Player Content */}
                            <div className="flex-1 relative flex items-center justify-center group/player">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key={selectedMediaForLightbox.currentIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="w-full h-full flex items-center justify-center"
                                    >
                                        {selectedMediaForLightbox.items[selectedMediaForLightbox.currentIndex]?.type === 'photo' ? (
                                            <img
                                                src={selectedMediaForLightbox.items[selectedMediaForLightbox.currentIndex].url}
                                                className="max-w-full max-h-full object-contain"
                                                alt="Preview"
                                            />
                                        ) : selectedMediaForLightbox.items[selectedMediaForLightbox.currentIndex]?.type === 'video' ? (
                                            <video
                                                src={selectedMediaForLightbox.items[selectedMediaForLightbox.currentIndex].url}
                                                autoPlay
                                                controls
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${selectedMediaForLightbox.items[selectedMediaForLightbox.currentIndex].url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1] || ''}?autoplay=1`}
                                                className="w-full h-full border-0"
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {/* Navigation Arrows */}
                                {selectedMediaForLightbox.items.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedMediaForLightbox(prev => prev ? {
                                                    ...prev,
                                                    currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length
                                                } : null);
                                            }}
                                            className="absolute left-6 w-14 h-14 rounded-full bg-white/5 hover:bg-sparta-gold hover:text-black text-white flex items-center justify-center transition-all border border-white/5 opacity-0 group-hover/player:opacity-100"
                                        >
                                            <ChevronRight size={32} className="rotate-180" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedMediaForLightbox(prev => prev ? {
                                                    ...prev,
                                                    currentIndex: (prev.currentIndex + 1) % prev.items.length
                                                } : null);
                                            }}
                                            className="absolute right-6 w-14 h-14 rounded-full bg-white/5 hover:bg-sparta-gold hover:text-black text-white flex items-center justify-center transition-all border border-white/5 opacity-0 group-hover/player:opacity-100"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Thumbnails Strip */}
                            {selectedMediaForLightbox.items.length > 1 && (
                                <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-center gap-4">
                                    {selectedMediaForLightbox.items.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedMediaForLightbox(prev => prev ? { ...prev, currentIndex: idx } : null)}
                                            className={`w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all 
                                                ${selectedMediaForLightbox.currentIndex === idx ? 'border-sparta-gold scale-110 shadow-lg shadow-sparta-gold/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                        >
                                            {item.type === 'photo' ? (
                                                <img src={item.url} className="w-full h-full object-cover" />
                                            ) : item.type === 'video' ? (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center"><Play size={16} /></div>
                                            ) : (
                                                <img src={`https://img.youtube.com/vi/${item.url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/)?.[1] || '0'}/0.jpg`} className="w-full h-full object-cover" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CREATE COLLECTION MODAL */}
            <AnimatePresence>
                {isCollectionModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-[4rem] p-12 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                            <h3 className="text-3xl font-russo text-white uppercase mb-8 flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400"><Layers size={24} /></div>
                                <span>{editingCollection ? 'Редактировать Папку' : 'Новая Коллекция'}</span>
                            </h3>

                            <div className="space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Название папки</label>
                                    <input
                                        type="text"
                                        placeholder="Напр: Растяжка, ОФП, Техника..."
                                        value={newCollectionData.title}
                                        onChange={(e) => setNewCollectionData({ ...newCollectionData, title: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-sm text-white focus:border-purple-500/30 outline-none transition-all font-bold placeholder:text-white/10"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Цветовая метка</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['#D4AF37', '#A855F7', '#3B82F6', '#10B981', '#EF4444', '#F97316', '#06B6D4'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCollectionData({ ...newCollectionData, color })}
                                                className={`w-10 h-10 rounded-full transition-all border-4 ${newCollectionData.color === color ? 'border-white scale-125' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button onClick={() => setIsCollectionModalOpen(false)} className="flex-1 py-5 bg-white/5 text-white hover:bg-white/10 font-black uppercase text-xs">ОТМЕНА</Button>
                                    <Button
                                        onClick={handleSaveCollection}
                                        disabled={!newCollectionData.title}
                                        className="flex-1 py-5 bg-purple-500 text-white font-black uppercase text-xs shadow-xl shadow-purple-500/20"
                                    >
                                        {editingCollection ? 'СОХРАНИТЬ' : 'СОЗДАТЬ'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachSection;
