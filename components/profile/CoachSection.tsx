import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Calendar as CalendarIcon,
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
    Activity,
    Activity as ActivityIcon,
    MoreVertical,
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
    CheckSquare,
    Tag,
    Eye,
    ArrowUp,
    ArrowDown
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
import ExerciseMediaGrid from './coach/ExerciseMediaGrid';
import ExerciseDetailModal from './coach/ExerciseDetailModal';
import CreateExerciseModal from './coach/CreateExerciseModal';
import CreateTrainingPlanModal from './coach/CreateTrainingPlanModal';
import TrainingPlanConspectModal from './coach/TrainingPlanConspectModal';
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

export interface ExerciseTopic {
    id: string;
    label: string;
    icon: string;
    coachId?: string;
    order?: number;
    isCustom?: boolean;
    createdAt?: any;
    updatedAt?: any;
}

const DEFAULT_EXERCISE_CATEGORIES = [
    { id: 'all', label: 'Все', icon: Layers },
    { id: 'dribbling', label: '⚽ Дриблинг и ведение', icon: Zap },
    { id: 'shooting', label: '🎯 Удары', icon: Target },
    { id: 'passing', label: '🔄 Передачи и пас', icon: RefreshCw },
    { id: 'warmup', label: '⚡ Разминка и координация', icon: Activity },
    { id: 'tactics', label: '🛡️ Тактика', icon: Shield },
    { id: 'goalkeeping', label: '🧤 Вратари', icon: Sparkles }
];

const EXERCISE_CATEGORIES = DEFAULT_EXERCISE_CATEGORIES;

const AGE_FILTER_OPTIONS = [
    { id: 'all', label: 'Все возраста' },
    { id: '6-8', label: '6–8 лет' },
    { id: '9-11', label: '9–11 лет' },
    { id: '12-15', label: '12–15 лет' }
];

const DURATION_FILTER_OPTIONS = [
    { id: 'all', label: 'Любая длительность' },
    { id: 'under10', label: '⚡ до 10 мин' },
    { id: '10-20', label: '⏱ 10–20 мин' },
    { id: '20plus', label: '⏳ 20+ мин' }
];

const getExerciseCategoryLabel = (cat: string, customList: any[] = []) => {
    const foundCustom = customList.find(c => c.id === cat || c.label === cat);
    if (foundCustom) return foundCustom.label;
    switch (cat) {
        case 'dribbling':
        case 'technique':
            return '⚽ Дриблинг и ведение';
        case 'shooting':
            return '🎯 Удары';
        case 'passing':
            return '🔄 Передачи и пас';
        case 'warmup':
        case 'recovery':
        case 'flexibility':
        case 'strength':
            return '⚡ Разминка и координация';
        case 'tactics':
        case 'endurance':
            return '🛡️ Тактика';
        case 'goalkeeping':
            return '🧤 Вратари';
        default:
            return cat || '⚽ Упражнение';
    }
};

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
    initialSubTab?: 'dashboard' | 'groups' | 'messages' | 'stats' | 'calendar' | 'exercises' | 'programs' | 'trials' | 'journal' | 'review' | 'materials';
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

    useEffect(() => {
        if (initialSubTab && initialSubTab !== mainTab) {
            setMainTab(initialSubTab as any);
        }
    }, [initialSubTab]);

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
    const [selectedExerciseAge, setSelectedExerciseAge] = useState<'all' | '6-8' | '9-11' | '12-15'>('all');
    const [selectedExerciseDuration, setSelectedExerciseDuration] = useState<'all' | 'under10' | '10-20' | '20plus'>('all');
    const [viewingExerciseDetail, setViewingExerciseDetail] = useState<any | null>(null);
    const [exerciseMenuOpenId, setExerciseMenuOpenId] = useState<string | null>(null);
    const [exerciseCollections, setExerciseCollections] = useState<any[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | 'all'>('all');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<any>(null);
    const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);
    const [changingTopicExerciseId, setChangingTopicExerciseId] = useState<string | null>(null);
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
    const [clipboardIds, setClipboardIds] = useState<string[]>([]);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [customExerciseTopics, setCustomExerciseTopics] = useState<any[]>([]);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<any | null>(null);
    const [newTopicData, setNewTopicData] = useState({ label: '', icon: '⚽' });
    const [newCollectionData, setNewCollectionData] = useState({ title: '', color: '#D4AF37' });

    // Drag-and-Drop States
    const [isDraggingExercise, setIsDraggingExercise] = useState(false);
    const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [dragNotification, setDragNotification] = useState<string | null>(null);

    // Training Plan Draft Builder States
    const [trainingPlanDraft, setTrainingPlanDraft] = useState<any[]>([]);
    const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
    const [planAssignmentData, setPlanAssignmentData] = useState({
        groupId: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        title: '',
        description: '',
        intensity: 'medium' as 'low' | 'medium' | 'high'
    });

    const allExerciseCategories = useMemo(() => {
        const customMap = new Map<string, any>();
        customExerciseTopics.forEach(t => {
            customMap.set(t.id, t);
        });

        const baseList = DEFAULT_EXERCISE_CATEGORIES.map(c => {
            if (customMap.has(c.id)) {
                const custom = customMap.get(c.id);
                if (custom.deleted) return null;
                return {
                    id: custom.id,
                    label: custom.icon ? `${custom.icon} ${custom.label}` : custom.label,
                    icon: custom.icon || '⚽',
                    rawLabel: custom.label,
                    isCustom: true,
                    order: custom.order ?? 0
                };
            }
            const parts = c.label.split(' ');
            const icon = parts[0];
            const rawLabel = parts.slice(1).join(' ');
            return {
                id: c.id,
                label: c.label,
                icon: icon,
                rawLabel: rawLabel || c.label,
                isCustom: false,
                order: 0
            };
        }).filter(Boolean) as any[];

        const extraCustomList = customExerciseTopics
            .filter(t => !DEFAULT_EXERCISE_CATEGORIES.some(c => c.id === t.id) && !t.deleted)
            .map(t => ({
                id: t.id,
                label: t.icon ? `${t.icon} ${t.label}` : t.label,
                icon: t.icon || '⚽',
                rawLabel: t.label,
                isCustom: true,
                order: t.order ?? 99
            }));

        return [...baseList, ...extraCustomList];
    }, [customExerciseTopics]);
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
    const [trainingPlanAgeFilter, setTrainingPlanAgeFilter] = useState<string>('all');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [selectedPlanForConspect, setSelectedPlanForConspect] = useState<any>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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
        const unsubTopics = onSnapshot(collection(db, "exercise_topics"), (snap) => {
            setCustomExerciseTopics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

        return () => { unsubExercises(); unsubTemplates(); unsubCollections(); unsubTopics(); unsubPendingSub(); unsubTrainingPlan(); unsubHomework(); };
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

    const handleContactParent = async (person: any) => {
        if (!person) return;

        try {
            const rawPhone = person.parentPhone || person.phone || person.originalUser?.parentPhone || person.originalUser?.phone || '';
            const cleanPhone = String(rawPhone).replace(/\D/g, '');
            let parentUid = person.parentId ||
                person.parentUid ||
                person.userId ||
                person.assignedUid ||
                person.originalUser?.parentId ||
                person.originalUser?.parentUid ||
                (person.role === 'parent' ? (person.uid || person.id) : null);
            let parentUser: any = null;

            // 1. Check parentId if present
            if (parentUid && parentUid.length > 3) {
                try {
                    const snap = await getDoc(doc(db, "users", parentUid));
                    if (snap.exists()) {
                        parentUser = { id: snap.id, ...snap.data() };
                    } else {
                        parentUid = null;
                    }
                } catch {
                    parentUid = null;
                }
            }

            // 2. Lookup in users collection by phone
            if (!parentUid && cleanPhone.length >= 10) {
                const phoneVariants = [
                    cleanPhone,
                    `+7${cleanPhone.slice(-10)}`,
                    `8${cleanPhone.slice(-10)}`,
                    `7${cleanPhone.slice(-10)}`
                ];

                const q1 = query(
                    collection(db, "users"),
                    where("phone", "in", phoneVariants),
                    limit(1)
                );
                const snap1 = await getDocs(q1);

                if (!snap1.empty) {
                    parentUser = { id: snap1.docs[0].id, ...snap1.docs[0].data() };
                    parentUid = parentUser.id;
                } else {
                    const q2 = query(
                        collection(db, "users"),
                        where("parentPhone", "in", phoneVariants),
                        limit(1)
                    );
                    const snap2 = await getDocs(q2);
                    if (!snap2.empty) {
                        parentUser = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
                        parentUid = parentUser.id;
                    }
                }
            }

            // Scenario A: Parent account exists
            if (parentUid && parentUser) {
                const currentCoachId = user?.uid || userProfile?.coachId || 'coach';
                const coachName = userProfile?.name || userProfile?.full_name || 'Тренер';
                const parentName =
                    parentUser.full_name ||
                    parentUser.name ||
                    parentUser.displayName ||
                    person.parentName ||
                    person.parentDisplayName ||
                    'Родитель';
                const studentName =
                    person.childName ||
                    person.childFirstName ||
                    person.name ||
                    'Спортсмен';

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
                        childName: studentName,
                        studentName: studentName,
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
                        name: `Чат с родителем (${studentName})`,
                        type: 'parent',
                        childName: studentName,
                        studentName: studentName,
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
                        lastMessage: "Заявка на пробное занятие принята",
                        lastMessageAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        createdBy: currentCoachId,
                        isPrivate: true
                    });
                    targetChatId = newChatRef.id;
                }

                window.dispatchEvent(
                    new CustomEvent('sparta_navigate_tab', {
                        detail: {
                            tab: 'messages_unified',
                            chatId: targetChatId,
                            targetUid: parentUid,
                            targetName: parentName,
                            studentName: studentName
                        }
                    })
                );

                navigate(`/dashboard?tab=messages_unified&chatId=${targetChatId}&targetUid=${parentUid}&targetName=${encodeURIComponent(parentName)}&studentName=${encodeURIComponent(studentName)}`);
            } else {
                // Scenario B: Parent not registered yet -> show prompt with tel
                if (cleanPhone) {
                    const formatted = cleanPhone.startsWith('8') && cleanPhone.length === 11
                        ? '+7 ' + cleanPhone.slice(1)
                        : `+${cleanPhone}`;
                    alert(`Родитель еще не зарегистрировался на платформе.\nСвяжитесь по телефону: ${formatted}`);
                } else {
                    alert('Родитель еще не зарегистрировался на платформе. Телефон не указан в заявке.');
                }
            }
        } catch (err) {
            console.error("Error in handleContactParent:", err);
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

    const handleSaveNewExercise = async (payload: any) => {
        setIsSavingExercise(true);
        try {
            if (editingExercise) {
                await updateDoc(doc(db, 'exercises', editingExercise.id), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'exercises'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            setIsExerciseModalOpen(false);
            setEditingExercise(null);
        } catch (err: any) {
            console.error("Error saving exercise:", err);
            throw err;
        } finally {
            setIsSavingExercise(false);
        }
    };

    const handleDuplicateExercise = async (ex: any) => {
        try {
            const { id, createdAt, updatedAt, ...rest } = ex;
            await addDoc(collection(db, 'exercises'), {
                ...rest,
                title: `${ex.title} (Копия)`,
                coachId: userProfile?.coachId || 'coach',
                coachName: userProfile?.name || 'Тренер',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setExerciseMenuOpenId(null);
            alert(`✅ Создана копия упражнения «${ex.title}»`);
        } catch (err) {
            console.error("Error duplicating exercise:", err);
            alert("Ошибка при создании копии упражнения.");
        }
    };

    const handleDeleteExercise = async (id: string, mediaItems: any[]) => {
        if (!window.confirm("Вы уверены, что хотите удалить это упражнение?")) return;

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
        setIsTemplateModalOpen(true);
    };

    const handleDuplicateTemplate = async (template: any) => {
        try {
            const copyPayload = {
                ...template,
                title: `Копия — ${template.title}`,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            delete copyPayload.id;
            await addDoc(collection(db, "training_templates"), copyPayload);
            setDragNotification(`План «${template.title}» продублирован`);
            setTimeout(() => setDragNotification(null), 3000);
        } catch (err) {
            console.error("Error duplicating template:", err);
            alert("Ошибка при копировании плана тренировки.");
        }
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

    const handleAddToPlanDraft = (exercise: any) => {
        const draftItem = {
            ...exercise,
            draftId: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            durationMinutes: Number(exercise.durationMinutes) || 15
        };
        setTrainingPlanDraft(prev => [...prev, draftItem]);
    };

    const handleRemoveFromPlanDraft = (draftId: string) => {
        setTrainingPlanDraft(prev => prev.filter(item => item.draftId !== draftId));
    };

    const handleReorderPlanDraft = (index: number, direction: 'up' | 'down') => {
        setTrainingPlanDraft(prev => {
            const copy = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= copy.length) return prev;
            const temp = copy[index];
            copy[index] = copy[targetIndex];
            copy[targetIndex] = temp;
            return copy;
        });
    };

    const handleUpdateDraftItemDuration = (draftId: string, duration: number) => {
        setTrainingPlanDraft(prev => prev.map(item =>
            item.draftId === draftId ? { ...item, durationMinutes: Math.max(1, duration) } : item
        ));
    };

    const handleSavePlanToGroup = async () => {
        if (trainingPlanDraft.length === 0) return;
        const targetGId = planAssignmentData.groupId || selectedGroupId || myGroups[0]?.id;
        if (!targetGId) {
            alert('Пожалуйста, выберите группу для назначения плана.');
            return;
        }

        const totalMins = trainingPlanDraft.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 15), 0);
        const planTitle = planAssignmentData.title.trim() || `Тренировка (${trainingPlanDraft.length} упр.)`;

        try {
            await addDoc(collection(db, "trainingPlan"), {
                groupId: targetGId,
                title: planTitle,
                description: planAssignmentData.description || '',
                date: planAssignmentData.date,
                time: planAssignmentData.time,
                intensity: planAssignmentData.intensity,
                totalMinutes: totalMins,
                exercises: trainingPlanDraft.map(({ draftId, ...rest }) => rest),
                coachId: userProfile?.coachId || 'coach',
                coachName: userProfile?.name || 'Тренер',
                status: 'assigned',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            alert(`✅ Тренировка «${planTitle}» успешно сохранена и назначена группе!`);
            setTrainingPlanDraft([]);
            setIsPlanDrawerOpen(false);
        } catch (err) {
            console.error("Error saving training plan to group:", err);
            alert("Ошибка при сохранении плана тренировки");
        }
    };

    const handleSavePlanAsTemplate = async () => {
        if (trainingPlanDraft.length === 0) return;
        const templateTitle = prompt('Введите название готовой тренировки (шаблона):', planAssignmentData.title.trim() || 'Футбольный тренировочный комплекс');
        if (!templateTitle) return;

        const totalMins = trainingPlanDraft.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 15), 0);

        try {
            await addDoc(collection(db, "training_templates"), {
                title: templateTitle.trim(),
                description: planAssignmentData.description || '',
                category: 'Общая',
                intensity: planAssignmentData.intensity,
                durationMinutes: totalMins,
                exercises: trainingPlanDraft.map(({ draftId, ...rest }) => rest),
                coachId: userProfile?.coachId || 'coach',
                coachName: userProfile?.name || 'Тренер',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            alert(`✅ Шаблон «${templateTitle}» успешно сохранён в раздел «Готовые тренировки»!`);
        } catch (err) {
            console.error("Error saving template:", err);
            alert("Ошибка при сохранении шаблона");
        }
    };

    const handleChangeCategory = async (exId: string, categoryId: string, categoryLabel: string) => {
        try {
            await updateDoc(doc(db, "exercises", exId), {
                category: categoryId,
                categoryLabel: categoryLabel,
                updatedAt: serverTimestamp()
            });
            setChangingTopicExerciseId(null);
            setExerciseMenuOpenId(null);
        } catch (err) {
            console.error("Error changing topic:", err);
            alert("Ошибка при смене темы");
        }
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

    const handleDropExerciseToFolder = async (targetColId: string, folderTitle: string) => {
        const exId = draggedExerciseId;
        if (!exId) return;
        setIsDraggingExercise(false);
        setDraggedExerciseId(null);
        setDragOverFolderId(null);
        
        try {
            await updateDoc(doc(db, "exercises", exId), {
                collectionId: targetColId,
                updatedAt: serverTimestamp()
            });
            setDragNotification(`Упражнение перемещено в папку «${folderTitle}»`);
            setTimeout(() => setDragNotification(null), 3500);
        } catch (err) {
            console.error("Error moving exercise via drag-and-drop:", err);
            alert("Ошибка при перемещении упражнения");
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
                    coachId: userProfile?.coachId || 'coach',
                    createdAt: serverTimestamp()
                });
            }
            setNewCollectionData({ title: '', color: '#D4AF37' });
            setEditingCollection(null);
            setIsCollectionModalOpen(false);
        } catch (err) {
            console.error("Error saving collection:", err);
            alert("Ошибка при сохранении папки");
        }
    };

    const handleDeleteCollection = async (id: string) => {
        if (!window.confirm('Удалить папку? Все упражнения сохранятся в общем каталоге.')) return;
        try {
            const affected = exercises.filter(ex => ex.collectionId === id);
            if (affected.length > 0) {
                const batch = writeBatch(db);
                affected.forEach(ex => {
                    batch.update(doc(db, "exercises", ex.id), { collectionId: 'all' });
                });
                await batch.commit();
            }
            await deleteDoc(doc(db, "exercise_collections", id));
            if (selectedCollectionId === id) {
                setSelectedCollectionId('all');
            }
        } catch (err) {
            console.error("Error deleting collection:", err);
            alert("Ошибка при удалении папки");
        }
    };

    const handleSaveTopic = async () => {
        if (!newTopicData.label.trim()) return;
        try {
            if (editingTopic) {
                await setDoc(doc(db, "exercise_topics", editingTopic.id), {
                    label: newTopicData.label.trim(),
                    icon: newTopicData.icon || '⚽',
                    coachId: userProfile?.coachId || 'system',
                    order: editingTopic.order ?? 0,
                    isCustom: true,
                    deleted: false,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } else {
                await addDoc(collection(db, "exercise_topics"), {
                    label: newTopicData.label.trim(),
                    icon: newTopicData.icon || '⚽',
                    coachId: userProfile?.coachId || 'system',
                    order: customExerciseTopics.length + 1,
                    isCustom: true,
                    deleted: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            setNewTopicData({ label: '', icon: '⚽' });
            setEditingTopic(null);
            setIsTopicModalOpen(false);
        } catch (err) {
            console.error("Error saving topic:", err);
            alert("Ошибка при сохранении темы");
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        if (!window.confirm('Удалить эту футбольную тему? Все упражнения сохранятся в базе.')) return;
        try {
            await setDoc(doc(db, "exercise_topics", topicId), {
                deleted: true,
                updatedAt: serverTimestamp()
            }, { merge: true });
            if (selectedExerciseCategory === topicId) {
                setSelectedExerciseCategory('all');
            }
        } catch (err) {
            console.error("Error deleting topic:", err);
            alert("Ошибка при удалении темы");
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
            const trainingData: any = {
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

            {/* Navigation Command Dock v4.0 (4 Primary Tabs) - Desktop / Tablet */}
            <div className={`sticky top-3 sm:top-8 z-[100] hidden md:flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 backdrop-blur-3xl border rounded-2xl sm:rounded-[2.5rem] w-full sm:w-fit overflow-x-auto no-scrollbar mx-auto lg:mx-0 shadow-3xl transition-all duration-500 ${theme === 'light'
                    ? 'bg-white/80 border-black/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
                    : 'bg-[#111]/80 border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.3)]'}`}>
                {[
                    { id: 'dashboard', label: '⚽ Главная / Тренировка', shortLabel: 'Главная', icon: LayoutDashboard },
                    { id: 'journal', label: '👥 Мои группы и дети', shortLabel: 'Группы', icon: Users },
                    { id: 'review', label: '📝 Проверка заданий', shortLabel: 'Проверка', icon: CheckSquare, badge: pendingSubmissionsCount },
                    { id: 'trials', label: '📥 Новички и заявки', shortLabel: 'Заявки', icon: UserPlus, badge: trialRequests.length },
                    { id: 'materials', label: '📋 Упражнения и планы', shortLabel: 'Материалы', icon: BookOpen }
                ].map((tab) => {
                    const isActive = mainTab === tab.id || (tab.id === 'materials' && (mainTab === 'exercises' || mainTab === 'programs' || mainTab === 'calendar'));
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id as any)}
                            className={`group relative flex items-center gap-2 sm:gap-3 px-3.5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-[1.8rem] transition-all duration-500 overflow-hidden cursor-pointer shrink-0 ${
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
                            <span className={`relative z-10 text-[11px] sm:text-xs font-russo uppercase tracking-wider transition-all whitespace-nowrap ${
                                isActive ? 'opacity-100' : 'opacity-70'
                            }`}>
                                <span className="sm:hidden">{tab.shortLabel}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </span>

                            {tab.badge ? (
                                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                                    <span className={`flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 sm:px-1.5 rounded-full text-[8px] sm:text-[9px] font-black shadow-lg transition-all ${
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
                                myGroups={myGroups}
                                allGroups={allGroups}
                                user={user}
                                userProfile={userProfile}
                                onEnrollStudent={async (trial, groupId) => {
                                    setSelectedTrialRequest(trial);
                                    await handleEnrollTrial(groupId);
                                }}
                                onArchiveRequest={async (trialId) => {
                                    await updateDoc(doc(db, "requests", trialId), {
                                        status: 'archived',
                                        archivedAt: serverTimestamp()
                                    });
                                }}
                                onDeleteRequest={handleDeleteTrialRequest}
                                onContactParent={handleContactParent}
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
                            {/* Materials SubTab Switcher & Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                        Библиотека упражнений и тренировок
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        База практических упражнений, готовые тренировочные планы и календарь занятий
                                    </p>
                                </div>

                                {/* 3 Upper-level Tabs */}
                                <div className="flex items-center gap-1.5 p-1.5 bg-black/60 glass-panel border border-white/10 rounded-2xl w-fit shadow-xl">
                                    {[
                                        { id: 'exercises', label: '⚽ База упражнений' },
                                        { id: 'programs', label: '📋 Готовые тренировки' },
                                        { id: 'calendar', label: '📅 Календарь' }
                                    ].map(sub => {
                                        const active = (mainTab === sub.id) || (mainTab === 'materials' && materialsSubTab === sub.id);
                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => {
                                                    setMainTab('materials');
                                                    setMaterialsSubTab(sub.id as any);
                                                }}
                                                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-russo uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                                    active
                                                        ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20 font-black'
                                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <span>{sub.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
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

                            {/* View 2: Exercises (Two-Column Football Explorer) */}
                            {((mainTab === 'materials' && materialsSubTab === 'exercises') || mainTab === 'exercises') && (
                                <div className="flex flex-col lg:flex-row gap-6 items-start">
                                    {/* LEFT COLUMN: Folders & Football Topics Explorer (~280px) */}
                                    <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">
                                        {/* Catalog Root & All Exercises */}
                                        <div className="bg-[#141416]/95 border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-2">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-3 pt-1">
                                                Каталог
                                            </div>
                                            <button
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDragEnter={() => setDragOverFolderId('all')}
                                                onDragLeave={() => setDragOverFolderId(null)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    handleDropExerciseToFolder('all', 'Все упражнения (Без папки)');
                                                }}
                                                onClick={() => {
                                                    setSelectedCollectionId('all');
                                                    setSelectedExerciseCategory('all');
                                                }}
                                                className={`w-full px-4 py-3 rounded-2xl text-xs font-russo uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                                                    dragOverFolderId === 'all'
                                                        ? 'bg-amber-400 text-black ring-4 ring-amber-400/50 scale-[1.03] shadow-xl'
                                                        : selectedCollectionId === 'all' && selectedExerciseCategory === 'all'
                                                            ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/25 font-black'
                                                            : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <FolderOpen size={16} className={dragOverFolderId === 'all' || (selectedCollectionId === 'all' && selectedExerciseCategory === 'all') ? 'text-black' : 'text-amber-400'} />
                                                    <span>Все упражнения</span>
                                                </div>
                                                <span className={`text-xs font-mono font-bold ${
                                                    dragOverFolderId === 'all' || (selectedCollectionId === 'all' && selectedExerciseCategory === 'all')
                                                        ? 'text-black'
                                                        : 'text-amber-400/90'
                                                }`}>
                                                    ({exercises.length})
                                                </span>
                                            </button>
                                        </div>

                                        {/* Coach Folders (exercise_collections) */}
                                        <div className="bg-[#141416]/95 border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
                                            <div className="flex items-center justify-between px-3 pt-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                    Мои папки
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingCollection(null);
                                                        setNewCollectionData({ title: '', color: '#D4AF37' });
                                                        setIsCollectionModalOpen(true);
                                                    }}
                                                    className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer transition-all"
                                                    title="Создать новую папку"
                                                >
                                                    <Plus size={14} className="stroke-[3]" /> Создать
                                                </button>
                                            </div>

                                            {/* Drag Indicator Prompt */}
                                            {isDraggingExercise && (
                                                <div className="p-2.5 bg-amber-500/20 border-2 border-dashed border-amber-400/80 rounded-2xl text-center text-[10px] font-black text-amber-300 uppercase tracking-widest animate-pulse shadow-md">
                                                    ⬇ Перетащите для быстрого перемещения
                                                </div>
                                            )}

                                            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                                {exerciseCollections.map((col) => {
                                                    const count = exercises.filter(ex => ex.collectionId === col.id).length;
                                                    const isSelected = selectedCollectionId === col.id;
                                                    const isDragOver = dragOverFolderId === col.id;

                                                    return (
                                                        <div
                                                            key={col.id}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.dataTransfer.dropEffect = 'move';
                                                            }}
                                                            onDragEnter={() => setDragOverFolderId(col.id)}
                                                            onDragLeave={() => setDragOverFolderId(null)}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                handleDropExerciseToFolder(col.id, col.title);
                                                            }}
                                                            className={`group/folder flex items-center justify-between p-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                                                                isDragOver
                                                                    ? 'bg-amber-500/30 text-white border-amber-400 ring-2 ring-amber-400/70 scale-[1.04] shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                                                                    : isSelected
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                                                        : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedCollectionId(col.id);
                                                                setSelectedExerciseCategory('all');
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div
                                                                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                                                    style={{ backgroundColor: col.color || '#D4AF37' }}
                                                                />
                                                                <span className="truncate">{col.title}</span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    isSelected ? 'bg-black/20 text-black font-bold' : 'bg-white/5 text-zinc-400'
                                                                }`}>
                                                                    {count}
                                                                </span>

                                                                {/* Action buttons (Edit & Delete) */}
                                                                <div className="opacity-60 group-hover/folder:opacity-100 flex items-center gap-1 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingCollection(col);
                                                                            setNewCollectionData({ title: col.title, color: col.color || '#D4AF37' });
                                                                            setIsCollectionModalOpen(true);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${isSelected ? 'text-amber-300 hover:text-white' : 'text-zinc-400 hover:text-white'}`}
                                                                        title="Редактировать папку"
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCollection(col.id);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg hover:bg-red-500/20 transition-colors ${isSelected ? 'text-amber-300 hover:text-red-400' : 'text-zinc-400 hover:text-red-400'}`}
                                                                        title="Удалить папку"
                                                                    >
                                                                        <TrashIcon size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {exerciseCollections.length === 0 && (
                                                    <div className="p-3 text-center text-xs text-zinc-500">
                                                        Папок пока нет. Нажмите «+ Создать», чтобы сгруппировать упражнения.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Football Topics / Направления */}
                                        <div className="bg-[#141416]/95 border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-2">
                                            <div className="flex items-center justify-between px-3 pt-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                    Футбольные темы
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setEditingTopic(null);
                                                        setNewTopicData({ label: '', icon: '⚽' });
                                                        setIsTopicModalOpen(true);
                                                    }}
                                                    className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer transition-all"
                                                    title="Создать новую футбольную тему"
                                                >
                                                    <Plus size={14} className="stroke-[3]" /> Создать
                                                </button>
                                            </div>

                                            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                {allExerciseCategories.filter(c => c.id !== 'all').map((cat) => {
                                                    const count = exercises.filter(ex => {
                                                        if (cat.id === 'dribbling') return ex.category === 'dribbling' || ex.category === 'technique';
                                                        if (cat.id === 'shooting') return ex.category === 'shooting';
                                                        if (cat.id === 'passing') return ex.category === 'passing';
                                                        if (cat.id === 'warmup') return ex.category === 'warmup' || ex.category === 'recovery' || ex.category === 'flexibility' || ex.category === 'strength';
                                                        if (cat.id === 'tactics') return ex.category === 'tactics' || ex.category === 'endurance';
                                                        if (cat.id === 'goalkeeping') return ex.category === 'goalkeeping';
                                                        return ex.category === cat.id || ex.categoryLabel === cat.label || ex.categoryLabel === (cat as any).rawLabel;
                                                    }).length;

                                                    const isSelected = selectedExerciseCategory === cat.id && selectedCollectionId === 'all';

                                                    return (
                                                        <div
                                                            key={cat.id}
                                                            className={`group/topic flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-400 text-black shadow-md font-bold'
                                                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedExerciseCategory(cat.id);
                                                                setSelectedCollectionId('all');
                                                            }}
                                                        >
                                                            <span className="truncate flex-1 pr-2">{cat.label}</span>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                    isSelected ? 'bg-black/20 text-black font-bold' : 'bg-white/5 text-zinc-400'
                                                                }`}>
                                                                    {count}
                                                                </span>

                                                                {/* Action buttons (Edit & Delete) for ALL topics */}
                                                                <div className="opacity-60 group-hover/topic:opacity-100 flex items-center gap-1 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingTopic(cat);
                                                                            setNewTopicData({
                                                                                label: (cat as any).rawLabel || cat.label.replace(/^[^\s]+\s*/, ''),
                                                                                icon: (cat as any).icon || '⚽'
                                                                            });
                                                                            setIsTopicModalOpen(true);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${isSelected ? 'text-black hover:text-zinc-800' : 'text-zinc-400 hover:text-white'}`}
                                                                        title="Редактировать тему"
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteTopic(cat.id);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg hover:bg-red-500/20 transition-colors ${isSelected ? 'text-red-900 hover:text-red-950' : 'text-zinc-400 hover:text-red-400'}`}
                                                                        title="Удалить тему"
                                                                    >
                                                                        <TrashIcon size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: Search, Selectors & Exercise Grid */}
                                    <div className="flex-1 min-w-0 space-y-6">
                                        {/* Upper Action Bar: Search + Yellow Button */}
                                        <div className="p-4 sm:p-5 rounded-[2rem] bg-[#141416]/95 border border-white/10 shadow-xl space-y-4">
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <div className="relative flex-1 w-full">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                                    <input
                                                        type="text"
                                                        placeholder="Поиск по названию или описанию..."
                                                        value={exerciseSearchQuery}
                                                        onChange={(e) => setExerciseSearchQuery(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl pl-11 pr-10 py-3 text-white text-sm outline-none transition-all placeholder:text-zinc-500"
                                                    />
                                                    {exerciseSearchQuery && (
                                                        <button
                                                            onClick={() => setExerciseSearchQuery('')}
                                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setEditingExercise(null);
                                                        setIsExerciseModalOpen(true);
                                                    }}
                                                    className="w-full sm:w-auto px-6 py-3.5 bg-sparta-gold hover:bg-amber-300 text-black rounded-2xl font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 active:scale-95"
                                                >
                                                    <PlusCircle size={18} />
                                                    <span>+ Новое упражнение</span>
                                                </button>
                                            </div>

                                            {/* Filter Selectors: Active Context, Age & Duration */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                                                {/* Left: Active Folder/Topic Badge (Only visible when filter is active) */}
                                                <div className="flex items-center gap-2">
                                                    {(selectedCollectionId !== 'all' || selectedExerciseCategory !== 'all') && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400 font-medium">Фильтр:</span>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCollectionId('all');
                                                                    setSelectedExerciseCategory('all');
                                                                }}
                                                                className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer group"
                                                                title="Нажмите, чтобы сбросить фильтр"
                                                            >
                                                                {selectedCollectionId !== 'all' ? (
                                                                    <>
                                                                        <div
                                                                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                                                                            style={{ backgroundColor: exerciseCollections.find(c => c.id === selectedCollectionId)?.color || '#D4AF37' }}
                                                                        />
                                                                        <span>Папка: {exerciseCollections.find(c => c.id === selectedCollectionId)?.title || 'Папка'}</span>
                                                                    </>
                                                                ) : (
                                                                    <span>Тема: {allExerciseCategories.find(c => c.id === selectedExerciseCategory)?.label || 'Категория'}</span>
                                                                )}
                                                                <span className="text-amber-400/80 group-hover:text-white font-bold ml-0.5">✕</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Dropdown Selectors */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {/* Age dropdown */}
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-zinc-400">Возраст:</span>
                                                        <div className="relative">
                                                            <select
                                                                value={selectedExerciseAge}
                                                                onChange={(e) => setSelectedExerciseAge(e.target.value as any)}
                                                                className="appearance-none bg-zinc-900 border border-white/20 focus:border-amber-400 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-zinc-100 outline-none cursor-pointer shadow-md hover:border-white/40 transition-colors"
                                                            >
                                                                {AGE_FILTER_OPTIONS.map(opt => (
                                                                    <option key={opt.id} value={opt.id} className="bg-zinc-900 text-white">
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs">
                                                                ▾
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Duration dropdown */}
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-zinc-400">Время:</span>
                                                        <div className="relative">
                                                            <select
                                                                value={selectedExerciseDuration}
                                                                onChange={(e) => setSelectedExerciseDuration(e.target.value as any)}
                                                                className="appearance-none bg-zinc-900 border border-white/20 focus:border-amber-400 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-zinc-100 outline-none cursor-pointer shadow-md hover:border-white/40 transition-colors"
                                                            >
                                                                {DURATION_FILTER_OPTIONS.map(opt => (
                                                                    <option key={opt.id} value={opt.id} className="bg-zinc-900 text-white">
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs">
                                                                ▾
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Exercises Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {exercises
                                                .filter(ex => {
                                                    // Collection / Folder Filter
                                                    if (selectedCollectionId !== 'all' && ex.collectionId !== selectedCollectionId) {
                                                        return false;
                                                    }

                                                    // Search
                                                    if (exerciseSearchQuery) {
                                                        const q = exerciseSearchQuery.toLowerCase();
                                                        const matchTitle = ex.title?.toLowerCase().includes(q);
                                                        const matchDesc = ex.description?.toLowerCase().includes(q);
                                                        const matchCat = ex.categoryLabel?.toLowerCase().includes(q) || ex.category?.toLowerCase().includes(q);
                                                        if (!matchTitle && !matchDesc && !matchCat) return false;
                                                    }

                                                    // Category
                                                    if (selectedExerciseCategory !== 'all') {
                                                        if (selectedExerciseCategory === 'dribbling' && ex.category !== 'dribbling' && ex.category !== 'technique') return false;
                                                        else if (selectedExerciseCategory === 'shooting' && ex.category !== 'shooting') return false;
                                                        else if (selectedExerciseCategory === 'passing' && ex.category !== 'passing') return false;
                                                        else if (selectedExerciseCategory === 'warmup' && ex.category !== 'warmup' && ex.category !== 'recovery' && ex.category !== 'flexibility' && ex.category !== 'strength') return false;
                                                        else if (selectedExerciseCategory === 'tactics' && ex.category !== 'tactics' && ex.category !== 'endurance') return false;
                                                        else if (selectedExerciseCategory === 'goalkeeping' && ex.category !== 'goalkeeping') return false;
                                                        else if (!['dribbling', 'shooting', 'passing', 'warmup', 'tactics', 'goalkeeping'].includes(selectedExerciseCategory)) {
                                                            const topic = allExerciseCategories.find(c => c.id === selectedExerciseCategory);
                                                            if (ex.category !== selectedExerciseCategory && ex.categoryLabel !== topic?.label && ex.categoryLabel !== (topic as any)?.rawLabel) return false;
                                                        }
                                                    }

                                                    // Age
                                                    if (selectedExerciseAge !== 'all') {
                                                        const ageStr = (ex.ageRange || '').toLowerCase();
                                                        if (selectedExerciseAge === '6-8' && !(ageStr.includes('6') || ageStr.includes('7') || ageStr.includes('8') || ageStr.includes('u8') || ageStr.includes('u10') || !ex.ageRange)) return false;
                                                        if (selectedExerciseAge === '9-11' && !(ageStr.includes('9') || ageStr.includes('10') || ageStr.includes('11') || ageStr.includes('u12') || !ex.ageRange)) return false;
                                                        if (selectedExerciseAge === '12-15' && !(ageStr.includes('12') || ageStr.includes('13') || ageStr.includes('14') || ageStr.includes('15') || ageStr.includes('u16') || !ex.ageRange)) return false;
                                                    }

                                                    // Duration
                                                    if (selectedExerciseDuration !== 'all') {
                                                        const mins = Number(ex.durationMinutes) || 15;
                                                        if (selectedExerciseDuration === 'under10' && mins >= 10) return false;
                                                        if (selectedExerciseDuration === '10-20' && (mins < 10 || mins > 20)) return false;
                                                        if (selectedExerciseDuration === '20plus' && mins <= 20) return false;
                                                    }

                                                    return true;
                                                })
                                                .map((ex) => {
                                                    const isMenuOpen = exerciseMenuOpenId === ex.id;
                                                    const folder = exerciseCollections.find(c => c.id === ex.collectionId);

                                                    return (
                                                        <div
                                                            key={ex.id}
                                                            draggable={true}
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData('text/plain', ex.id);
                                                                setIsDraggingExercise(true);
                                                                setDraggedExerciseId(ex.id);
                                                            }}
                                                            onDragEnd={() => {
                                                                setIsDraggingExercise(false);
                                                                setDraggedExerciseId(null);
                                                                setDragOverFolderId(null);
                                                            }}
                                                            onClick={() => setViewingExerciseDetail(ex)}
                                                            className={`group relative rounded-[2rem] bg-[#141416] border transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between cursor-pointer ${
                                                                draggedExerciseId === ex.id
                                                                    ? 'opacity-40 border-dashed border-amber-400 scale-[0.98]'
                                                                    : 'border-white/10 hover:border-amber-500/50 hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)]'
                                                            }`}
                                                        >
                                                            {/* Quick Actions Floating Toolbar */}
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute top-5 right-5 z-20 flex items-center gap-1 p-1 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl opacity-95 sm:opacity-50 sm:hover:opacity-100 sm:group-hover:opacity-100 transition-all duration-200"
                                                            >
                                                                {/* Edit */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingExercise(ex);
                                                                        handleOpenEditModal(ex);
                                                                    }}
                                                                    className="p-1.5 rounded-xl hover:bg-white/20 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
                                                                    title="✏️ Редактировать упражнение"
                                                                >
                                                                    <Pencil size={13} />
                                                                </button>

                                                                {/* Duplicate */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDuplicateExercise(ex)}
                                                                    className="p-1.5 rounded-xl hover:bg-white/20 text-zinc-300 hover:text-blue-400 transition-colors cursor-pointer"
                                                                    title="📑 Создать копию (Дублировать)"
                                                                >
                                                                    <Copy size={13} />
                                                                </button>

                                                                {/* Quick Move to Folder */}
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setMovingExerciseId(movingExerciseId === ex.id ? null : ex.id);
                                                                            setChangingTopicExerciseId(null);
                                                                        }}
                                                                        className={`p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer ${
                                                                            movingExerciseId === ex.id ? 'bg-purple-500/30 text-purple-300' : 'text-zinc-300 hover:text-purple-400'
                                                                        }`}
                                                                        title="📁 Переместить в папку"
                                                                    >
                                                                        <FolderOpen size={13} />
                                                                    </button>

                                                                    {movingExerciseId === ex.id && (
                                                                        <div
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#1a1a1c] border border-white/15 shadow-2xl p-2 z-40 space-y-1 max-h-48 overflow-y-auto custom-scrollbar"
                                                                        >
                                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2 py-1">
                                                                                Выберите папку:
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleMoveExercise(ex.id, 'all');
                                                                                    setMovingExerciseId(null);
                                                                                }}
                                                                                className="w-full text-left text-xs py-1.5 px-2.5 text-zinc-300 hover:text-white rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <span>📁</span>
                                                                                <span>Без папки (Общий)</span>
                                                                            </button>
                                                                            {exerciseCollections.map(col => (
                                                                                <button
                                                                                    key={col.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleMoveExercise(ex.id, col.id);
                                                                                        setMovingExerciseId(null);
                                                                                    }}
                                                                                    className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer truncate ${
                                                                                        ex.collectionId === col.id ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-zinc-300 hover:text-white'
                                                                                    }`}
                                                                                >
                                                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || '#D4AF37' }} />
                                                                                    <span className="truncate">{col.title}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Delete */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (window.confirm('Удалить это упражнение?')) {
                                                                            handleDeleteExercise(ex.id, ex.mediaItems || []);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 rounded-xl hover:bg-red-500/20 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
                                                                    title="🗑️ Удалить упражнение"
                                                                >
                                                                    <TrashIcon size={13} />
                                                                </button>
                                                            </div>

                                                            {/* Card Media Header */}
                                                            <div className="p-3 pb-0">
                                                                <ExerciseMediaGrid
                                                                    mediaItems={ex.mediaItems}
                                                                    mediaUrl={ex.mediaUrl}
                                                                    mediaType={ex.mediaType}
                                                                    title={ex.title}
                                                                    durationMinutes={ex.durationMinutes}
                                                                    onOpenLightbox={(idx) => {
                                                                        const items = ex.mediaItems && ex.mediaItems.length > 0
                                                                            ? ex.mediaItems
                                                                            : [{ url: ex.mediaUrl || ex.videoUrl, type: ex.mediaType || 'url' }];
                                                                        setSelectedMediaForLightbox({
                                                                            items,
                                                                            currentIndex: idx,
                                                                            title: ex.title
                                                                        });
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Card Body */}
                                                            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                                                                <div>
                                                                    {/* Meta Pills (Category, Age, Duration, Folder) */}
                                                                    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                                                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                                                                            {getExerciseCategoryLabel(ex.category, allExerciseCategories)}
                                                                        </span>

                                                                        <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-bold text-blue-300">
                                                                            👦 {ex.ageRange || '6–10 лет'}
                                                                        </span>

                                                                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
                                                                            ⏱ {ex.durationMinutes || 15} мин
                                                                        </span>

                                                                        {folder && (
                                                                            <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-bold text-purple-300 inline-flex items-center gap-1.5">
                                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color || '#A855F7' }} />
                                                                                {folder.title}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Title */}
                                                                    <h4 className="font-russo text-base sm:text-lg text-white uppercase tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
                                                                        {ex.title}
                                                                    </h4>

                                                                    {/* Description */}
                                                                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                                                        {ex.description || 'Инструкция по технике выполнения упражнения...'}
                                                                    </p>

                                                                    {/* Equipment chips */}
                                                                    {ex.equipment && ex.equipment.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                                                            {ex.equipment.slice(0, 3).map((eq: string, i: number) => (
                                                                                <span
                                                                                    key={i}
                                                                                    className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-medium"
                                                                                >
                                                                                    {eq}
                                                                                </span>
                                                                            ))}
                                                                            {ex.equipment.length > 3 && (
                                                                                <span className="text-[10px] text-zinc-500 font-medium self-center">
                                                                                    +{ex.equipment.length - 3}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setViewingExerciseDetail(ex);
                                                                        }}
                                                                        className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                                                    >
                                                                        <span>👀 Открыть</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddToPlanDraft(ex);
                                                                        }}
                                                                        className="py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                                                        title="Добавить в черновик плана тренировки"
                                                                    >
                                                                        <PlusCircle size={14} />
                                                                        <span>В план</span>
                                                                    </button>

                                                                    {/* ••• Menu */}
                                                                    <div className="relative">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExerciseMenuOpenId(isMenuOpen ? null : ex.id);
                                                                                setMovingExerciseId(null);
                                                                                setChangingTopicExerciseId(null);
                                                                            }}
                                                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                                                        >
                                                                            <MoreVertical size={16} />
                                                                        </button>

                                                                        {isMenuOpen && (
                                                                            <div
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl bg-[#1a1a1c] border border-white/15 shadow-2xl p-1.5 z-30 space-y-1"
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExerciseMenuOpenId(null);
                                                                                        setEditingExercise(ex);
                                                                                        setIsExerciseModalOpen(true);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                                                                >
                                                                                    <Pencil size={14} className="text-amber-400" /> Редактировать
                                                                                </button>
                                                                                
                                                                                {/* Move to folder */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setMovingExerciseId(movingExerciseId === ex.id ? null : ex.id);
                                                                                        setChangingTopicExerciseId(null);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                                                                >
                                                                                    <FolderOpen size={14} className="text-purple-400" /> Переместить в папку...
                                                                                </button>

                                                                                {movingExerciseId === ex.id && (
                                                                                    <div className="pl-3 py-1 space-y-1 max-h-36 overflow-y-auto border-t border-white/10 custom-scrollbar">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                handleMoveExercise(ex.id, 'all');
                                                                                                setExerciseMenuOpenId(null);
                                                                                            }}
                                                                                            className="w-full text-left text-[11px] py-1 px-2 text-zinc-400 hover:text-white rounded hover:bg-white/5"
                                                                                        >
                                                                                            Без папки (Общий)
                                                                                        </button>
                                                                                        {exerciseCollections.map(col => (
                                                                                            <button
                                                                                                key={col.id}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    handleMoveExercise(ex.id, col.id);
                                                                                                    setExerciseMenuOpenId(null);
                                                                                                }}
                                                                                                className="w-full text-left text-[11px] py-1 px-2 text-zinc-300 hover:text-white rounded hover:bg-white/5 flex items-center gap-1.5 truncate"
                                                                                            >
                                                                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || '#D4AF37' }} />
                                                                                                <span className="truncate">{col.title}</span>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Change Topic */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setChangingTopicExerciseId(changingTopicExerciseId === ex.id ? null : ex.id);
                                                                                        setMovingExerciseId(null);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                                                                >
                                                                                    <Tag size={14} className="text-amber-400" /> Изменить тему...
                                                                                </button>

                                                                                {changingTopicExerciseId === ex.id && (
                                                                                    <div className="pl-3 py-1 space-y-1 max-h-36 overflow-y-auto border-t border-white/10 custom-scrollbar">
                                                                                        {allExerciseCategories.filter(c => c.id !== 'all').map(cat => (
                                                                                            <button
                                                                                                key={cat.id}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    handleChangeCategory(ex.id, cat.id, cat.label);
                                                                                                }}
                                                                                                className={`w-full text-left text-[11px] py-1 px-2 rounded hover:bg-white/5 flex items-center gap-1.5 truncate ${
                                                                                                    ex.category === cat.id ? 'text-amber-400 font-bold bg-amber-400/10' : 'text-zinc-300 hover:text-white'
                                                                                                }`}
                                                                                            >
                                                                                                <span className="truncate">{cat.label}</span>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExerciseMenuOpenId(null);
                                                                                        handleDuplicateExercise(ex);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                                                                >
                                                                                    <Copy size={14} className="text-blue-400" /> Создать копию
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExerciseMenuOpenId(null);
                                                                                        if (window.confirm('Удалить это упражнение?')) {
                                                                                            handleDeleteExercise(ex.id, ex.mediaItems || []);
                                                                                        }
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                                                                                >
                                                                                    <TrashIcon size={14} /> Удалить
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                            {exercises.length === 0 && (
                                                <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6">
                                                    <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mb-4">
                                                        <Dumbbell size={36} />
                                                    </div>
                                                    <h4 className="text-xl font-russo text-white uppercase mb-2">База упражнений пуста</h4>
                                                    <p className="text-xs text-zinc-400 max-w-md mb-6">
                                                        Добавьте первое авторское упражнение или загрузите базовый набор упражнений футбольного клуба Sparta.
                                                    </p>
                                                    <div className="flex gap-3 flex-wrap justify-center">
                                                        <button
                                                            onClick={() => {
                                                                setEditingExercise(null);
                                                                setIsExerciseModalOpen(true);
                                                            }}
                                                            className="px-6 py-3 bg-sparta-gold text-black rounded-xl font-russo text-xs uppercase cursor-pointer"
                                                        >
                                                            + Создать упражнение
                                                        </button>
                                                        <button
                                                            onClick={handleAddDefaultExercises}
                                                            disabled={isSavingExercise}
                                                            className="px-6 py-3 bg-white/10 text-white rounded-xl text-xs font-bold uppercase hover:bg-white/20 cursor-pointer"
                                                        >
                                                            {isSavingExercise ? 'Загрузка...' : 'Добавить базовый набор'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        {/* View 3: Ready-Made Training Plans (training_templates) */}
                        {((mainTab === 'materials' && materialsSubTab === 'programs') || mainTab === 'programs') && (
                            <div className="space-y-6">
                                {/* Upper Header & Filters Bar */}
                                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-[#141416]/95 border border-white/10 shadow-2xl relative overflow-hidden">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shadow-inner">
                                                    📋
                                                </div>
                                                <h3 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                                    Готовые планы тренировок
                                                </h3>
                                            </div>
                                            <p className="text-zinc-400 text-xs sm:text-sm font-medium pl-1">
                                                Сборники упражнений для проведения занятий
                                            </p>
                                        </div>

                                        {/* Main CTA Button: + Собрать тренировку */}
                                        <button
                                            onClick={() => {
                                                setEditingTemplate(null);
                                                setIsTemplateModalOpen(true);
                                            }}
                                            className="px-7 py-3.5 bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
                                        >
                                            <Plus size={16} />
                                            <span>+ Собрать тренировку</span>
                                        </button>
                                    </div>

                                    {/* Age Filter Bar */}
                                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1.5">
                                            <Users size={13} className="text-amber-400" /> Возраст:
                                        </span>
                                        {[
                                            { id: 'all', label: 'Все' },
                                            { id: '6-8', label: '6–8 лет' },
                                            { id: '9-11', label: '9–11 лет' },
                                            { id: '12-15', label: '12–15 лет' }
                                        ].map((filter) => (
                                            <button
                                                key={filter.id}
                                                onClick={() => setTrainingPlanAgeFilter(filter.id)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                    trainingPlanAgeFilter === filter.id
                                                        ? 'bg-sparta-gold text-black border-sparta-gold shadow-md font-russo'
                                                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Plans Grid */}
                                {trainingTemplates.length === 0 ? (
                                    <div className="py-20 rounded-[2.5rem] bg-[#141416]/50 border border-white/5 flex flex-col items-center justify-center text-center p-6 space-y-4">
                                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl text-amber-400">
                                            📋
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-russo text-white uppercase mb-1">
                                                У вас пока нет готовых планов тренировок
                                            </h4>
                                            <p className="text-xs text-zinc-400 max-w-md">
                                                Нажмите кнопку «+ Собрать тренировку», чтобы быстро составить структурированный план занятия из упражнений
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingTemplate(null);
                                                setIsTemplateModalOpen(true);
                                            }}
                                            className="px-6 py-3 bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:bg-amber-300 transition-all cursor-pointer"
                                        >
                                            + Собрать первую тренировку
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {trainingTemplates
                                            .filter((template) => {
                                                if (trainingPlanAgeFilter === 'all') return true;
                                                const ageStr = (template.ageRange || template.age || '').toLowerCase();
                                                if (trainingPlanAgeFilter === '6-8') return ageStr.includes('6') || ageStr.includes('7') || ageStr.includes('8');
                                                if (trainingPlanAgeFilter === '9-11') return ageStr.includes('9') || ageStr.includes('10') || ageStr.includes('11');
                                                if (trainingPlanAgeFilter === '12-15') return ageStr.includes('12') || ageStr.includes('13') || ageStr.includes('14') || ageStr.includes('15');
                                                return true;
                                            })
                                            .map((template) => {
                                                const warmupExercises = template.stages?.warmup || [];
                                                const mainExercises = template.stages?.main || (Array.isArray(template.exercises) ? template.exercises : []);
                                                const cooldownExercises = template.stages?.cooldown || template.stages?.skills || [];

                                                const warmupMin = warmupExercises.reduce((acc: number, item: any) => acc + (Number(item?.durationMinutes) || 15), 0) || (warmupExercises.length > 0 ? warmupExercises.length * 15 : 0);
                                                const mainMin = mainExercises.reduce((acc: number, item: any) => acc + (Number(item?.durationMinutes) || 15), 0) || (mainExercises.length > 0 ? mainExercises.length * 15 : 0);
                                                const cooldownMin = cooldownExercises.reduce((acc: number, item: any) => acc + (Number(item?.durationMinutes) || 15), 0) || (cooldownExercises.length > 0 ? cooldownExercises.length * 15 : 0);

                                                const totalExercisesCount = warmupExercises.length + mainExercises.length + cooldownExercises.length;
                                                const totalTimeMin = (warmupMin + mainMin + cooldownMin) || Number(template.totalMinutes) || 60;

                                                return (
                                                    <div
                                                        key={template.id}
                                                        className="p-6 bg-[#141416] border border-white/10 hover:border-amber-500/40 rounded-[2.5rem] transition-all group flex flex-col justify-between space-y-4 shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] relative"
                                                    >
                                                        {/* Top Header of Card */}
                                                        <div className="space-y-3">
                                                            {/* Actions toolbar */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                                                                    <Users size={11} /> {template.ageRange || template.age || 'Все возрасты'}
                                                                </span>

                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleOpenEditTemplateModal(template)}
                                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
                                                                        title="Редактировать план"
                                                                    >
                                                                        <Edit2 size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDuplicateTemplate(template)}
                                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-sparta-gold/20 text-zinc-400 hover:text-sparta-gold transition-colors cursor-pointer"
                                                                        title="Копировать план"
                                                                    >
                                                                        <Copy size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                                                                        title="Удалить план"
                                                                    >
                                                                        <TrashIcon size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Title */}
                                                            <div>
                                                                <h4 className="text-lg font-russo text-white uppercase tracking-tight line-clamp-2 group-hover:text-amber-300 transition-colors">
                                                                    {template.title}
                                                                </h4>
                                                            </div>

                                                            {/* Badges Bar: Duration & Exercises count */}
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-white/10 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                                                                    <Clock size={11} /> {totalTimeMin} мин
                                                                </span>
                                                                <span className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-white/10 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                                                                    <Target size={11} /> {totalExercisesCount} упр.
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Body: 3 Visual Football Stages */}
                                                        <div className="space-y-2 py-1 flex-1">
                                                            {/* 1. Warmup */}
                                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                                                                        ⚡ Разминка
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold text-zinc-500">
                                                                        {warmupMin > 0 ? `${warmupMin} мин` : '15 мин'} • {warmupExercises.length} упр.
                                                                    </span>
                                                                </div>
                                                                {warmupExercises.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {warmupExercises.slice(0, 2).map((item: any, i: number) => (
                                                                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] text-zinc-300 truncate max-w-[150px]">
                                                                                {typeof item === 'string' ? (exercises.find(e => e.id === item)?.title || 'Упражнение') : (item.title || 'Упражнение')}
                                                                            </span>
                                                                        ))}
                                                                        {warmupExercises.length > 2 && (
                                                                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[8px] text-zinc-500 font-bold">
                                                                                +{warmupExercises.length - 2}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[9px] text-zinc-600 italic">Суставная гимнастика</p>
                                                                )}
                                                            </div>

                                                            {/* 2. Main Block */}
                                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                                                                        ⚽ Основной блок
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold text-zinc-500">
                                                                        {mainMin > 0 ? `${mainMin} мин` : '35 мин'} • {mainExercises.length} упр.
                                                                    </span>
                                                                </div>
                                                                {mainExercises.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {mainExercises.slice(0, 2).map((item: any, i: number) => (
                                                                            <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[9px] text-emerald-300 font-medium truncate max-w-[150px]">
                                                                                {typeof item === 'string' ? (exercises.find(e => e.id === item)?.title || 'Упражнение') : (item.title || 'Упражнение')}
                                                                            </span>
                                                                        ))}
                                                                        {mainExercises.length > 2 && (
                                                                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[8px] text-emerald-400 font-bold">
                                                                                +{mainExercises.length - 2}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[9px] text-zinc-600 italic">Технические упражнения</p>
                                                                )}
                                                            </div>

                                                            {/* 3. Game / Cooldown */}
                                                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px]">
                                                                        🥅 Игра и заминка
                                                                    </span>
                                                                    <span className="text-[10px] font-semibold text-zinc-500">
                                                                        {cooldownMin > 0 ? `${cooldownMin} мин` : '20 мин'} • {cooldownExercises.length} упр.
                                                                    </span>
                                                                </div>
                                                                {cooldownExercises.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {cooldownExercises.slice(0, 2).map((item: any, i: number) => (
                                                                            <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[9px] text-blue-300 font-medium truncate max-w-[150px]">
                                                                                {typeof item === 'string' ? (exercises.find(e => e.id === item)?.title || 'Упражнение') : (item.title || 'Упражнение')}
                                                                            </span>
                                                                        ))}
                                                                        {cooldownExercises.length > 2 && (
                                                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[8px] text-blue-400 font-bold">
                                                                                +{cooldownExercises.length - 2}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[9px] text-zinc-600 italic">Двусторонняя игра</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Footer Actions */}
                                                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                                            <button
                                                                onClick={() => setSelectedPlanForConspect(template)}
                                                                className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                                                            >
                                                                <span>👀 Конспект</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleOpenAssignmentModal(template, 'program')}
                                                                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-russo text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                                                            >
                                                                <Calendar size={13} />
                                                                <span>В график</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
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

            {/* Create / Edit Exercise Modal */}
            <CreateExerciseModal
                isOpen={isExerciseModalOpen}
                onClose={() => {
                    setIsExerciseModalOpen(false);
                    setEditingExercise(null);
                }}
                onSave={handleSaveNewExercise}
                editingExercise={editingExercise}
                coachId={userProfile?.coachId}
                coachName={userProfile?.name}
                collections={exerciseCollections}
                initialCollectionId={selectedCollectionId}
                categories={allExerciseCategories.filter(c => c.id !== 'all')}
            />

            {/* View Detailed Exercise Modal */}
            <ExerciseDetailModal
                isOpen={Boolean(viewingExerciseDetail)}
                exercise={viewingExerciseDetail}
                onClose={() => setViewingExerciseDetail(null)}
                onAddToPlan={(ex) => {
                    handleAddToPlanDraft(ex);
                    setViewingExerciseDetail(null);
                }}
                onEdit={(ex) => {
                    setViewingExerciseDetail(null);
                    setEditingExercise(ex);
                    setIsExerciseModalOpen(true);
                }}
            />


            {/* Create / Edit Training Plan Modal */}
            <CreateTrainingPlanModal
                isOpen={isTemplateModalOpen}
                onClose={() => {
                    setIsTemplateModalOpen(false);
                    setEditingTemplate(null);
                }}
                editingPlan={editingTemplate}
                coachId={userProfile?.coachId}
                coachName={userProfile?.name}
                allExercises={exercises}
            />

            {/* Training Plan Conspect Modal */}
            <TrainingPlanConspectModal
                isOpen={Boolean(selectedPlanForConspect)}
                plan={selectedPlanForConspect}
                onClose={() => setSelectedPlanForConspect(null)}
                onAssignToSchedule={(plan) => handleOpenAssignmentModal(plan, 'program')}
                onEdit={(plan) => {
                    handleOpenEditTemplateModal(plan);
                    setSelectedPlanForConspect(null);
                }}
                allExercises={exercises}
            />

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

                            <Button onClick={() => setIsExerciseGuideOpen(false)} className="w-full py-6 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-sparta-gold/20">ВСЁ РЇРЎРќРÓ, СПАСИБО!</Button>
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
                                            className="absolute left-6 w-14 h-14 rounded-full bg-black/60 hover:bg-sparta-gold hover:text-black text-white flex items-center justify-center transition-all border border-white/10 opacity-60 hover:opacity-100 group-hover/player:opacity-100 backdrop-blur-md cursor-pointer"
                                            title="Предыдущее"
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
                                            className="absolute right-6 w-14 h-14 rounded-full bg-black/60 hover:bg-sparta-gold hover:text-black text-white flex items-center justify-center transition-all border border-white/10 opacity-60 hover:opacity-100 group-hover/player:opacity-100 backdrop-blur-md cursor-pointer"
                                            title="Следующее"
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

            {/* CREATE / EDIT TOPIC MODAL */}
            <AnimatePresence>
                {isTopicModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 sm:p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                            <h3 className="text-2xl sm:text-3xl font-russo text-white uppercase mb-6 flex items-center gap-3">
                                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400">
                                    <Sparkles size={24} />
                                </div>
                                <span>{editingTopic ? 'Редактировать тему' : 'Новая футбольная тема'}</span>
                            </h3>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                        Иконка / Эмодзи
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl max-h-36 overflow-y-auto custom-scrollbar">
                                        {['⚽', '🎯', '🔄', '⚡', '🛡️', '🧤', '🧠', '🏃', '🥅', '👟', '⏱', '🏆', '🔥', '💥', '🧩', '📈'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setNewTopicData({ ...newTopicData, icon: emoji })}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                                                    newTopicData.icon === emoji
                                                        ? 'bg-amber-400 text-black scale-110 shadow-lg shadow-amber-400/20 font-bold'
                                                        : 'bg-white/5 text-white hover:bg-white/15'
                                                }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                        Название темы <span className="text-amber-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Напр: Стандарты и угловые, Игра головой..."
                                        value={newTopicData.label}
                                        onChange={(e) => setNewTopicData({ ...newTopicData, label: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-amber-400 outline-none transition-all font-bold placeholder:text-white/20"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            setIsTopicModalOpen(false);
                                            setEditingTopic(null);
                                        }}
                                        className="flex-1 py-4 bg-white/5 text-white hover:bg-white/10 font-black uppercase text-xs rounded-xl"
                                    >
                                        ОТМЕНА
                                    </Button>
                                    <Button
                                        onClick={handleSaveTopic}
                                        disabled={!newTopicData.label.trim()}
                                        className="flex-1 py-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-400/20"
                                    >
                                        {editingTopic ? 'СОХРАНИТЬ' : 'СОЗДАТЬ'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* FLOATING TRAINING PLAN BUILDER BOTTOM BAR */}
            <AnimatePresence>
                {trainingPlanDraft.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[190] w-[95%] max-w-2xl bg-[#141416]/95 backdrop-blur-2xl border-2 border-amber-500/40 rounded-full px-5 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-between gap-4 text-white"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold font-russo text-base flex-shrink-0 shadow-md shadow-amber-400/30">
                                {trainingPlanDraft.length}
                            </div>
                            <div className="truncate">
                                <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                                    В плане тренировки
                                </div>
                                <div className="text-xs text-zinc-300 font-semibold truncate">
                                    {trainingPlanDraft.length} упр. • {trainingPlanDraft.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 15), 0)} мин
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => setIsPlanDrawerOpen(true)}
                                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                            >
                                <Eye size={14} className="text-amber-400" />
                                <span>Посмотреть план</span>
                            </button>

                            <button
                                onClick={() => setIsPlanDrawerOpen(true)}
                                className="px-5 py-2.5 rounded-full bg-sparta-gold hover:bg-amber-300 text-black text-xs font-russo uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-400/25 flex items-center gap-1.5 active:scale-95"
                            >
                                <SaveIcon size={14} />
                                <span>Сохранить</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm('Очистить черновик плана тренировки?')) {
                                        setTrainingPlanDraft([]);
                                    }
                                }}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                                title="Очистить черновик"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TRAINING PLAN DRAWER / MODAL */}
            <AnimatePresence>
                {isPlanDrawerOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto custom-scrollbar">
                        <div className="fixed inset-0" onClick={() => setIsPlanDrawerOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-[#121214] border border-amber-500/30 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col my-auto z-10 max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-6 sm:p-8 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-b from-white/5 to-transparent">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[11px] font-bold uppercase tracking-wider">
                                            Конструктор тренировки
                                        </span>
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 text-zinc-300 rounded-full text-[11px] font-bold">
                                            {trainingPlanDraft.length} упр. • {trainingPlanDraft.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 15), 0)} мин
                                        </span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                        План занятия
                                    </h2>
                                </div>

                                <button
                                    onClick={() => setIsPlanDrawerOpen(false)}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all border border-white/10 cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content Columns */}
                            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto custom-scrollbar flex-1">
                                {/* Left Side: Exercise List (7 cols) */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                            Упражнения в занятии ({trainingPlanDraft.length})
                                        </h3>
                                        <button
                                            onClick={() => setTrainingPlanDraft([])}
                                            className="text-xs text-red-400 hover:text-red-300 hover:underline font-semibold cursor-pointer"
                                        >
                                            Очистить всё
                                        </button>
                                    </div>

                                    <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                                        {trainingPlanDraft.map((item, idx) => (
                                            <div
                                                key={item.draftId}
                                                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3 group"
                                            >
                                                {/* Left: Index & Thumb */}
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-6 text-center text-xs font-russo text-amber-400/80">
                                                        #{idx + 1}
                                                    </div>

                                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                                                        {item.mediaItems && item.mediaItems.length > 0 ? (
                                                            item.mediaItems[0].type === 'video' || item.mediaItems[0].type === 'url' ? (
                                                                <Play size={16} className="text-amber-400" />
                                                            ) : (
                                                                <img src={item.mediaItems[0].url} alt="" className="w-full h-full object-cover" />
                                                            )
                                                        ) : item.mediaUrl ? (
                                                            <Play size={16} className="text-amber-400" />
                                                        ) : (
                                                            <span className="text-lg">⚽</span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-bold text-white text-xs truncate uppercase tracking-tight">
                                                            {item.title}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[10px] text-amber-400/90 font-semibold truncate">
                                                                {item.categoryLabel || item.category || 'Упражнение'}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-500">•</span>
                                                            <span className="text-[10px] text-zinc-400 font-medium">
                                                                {item.ageRange || 'Все возраста'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Duration Stepper & Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Duration Adjuster */}
                                                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-2 py-1 gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateDraftItemDuration(item.draftId, (Number(item.durationMinutes) || 15) - 5)}
                                                            className="w-5 h-5 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-xs"
                                                            title="-5 минут"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold text-amber-300 min-w-[32px] text-center">
                                                            {item.durationMinutes || 15}м
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateDraftItemDuration(item.draftId, (Number(item.durationMinutes) || 15) + 5)}
                                                            className="w-5 h-5 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-xs"
                                                            title="+5 минут"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    {/* Move Up/Down */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <button
                                                            type="button"
                                                            disabled={idx === 0}
                                                            onClick={() => handleReorderPlanDraft(idx, 'up')}
                                                            className="p-1 rounded hover:bg-white/10 disabled:opacity-20 text-zinc-400 hover:text-white"
                                                            title="Переместить выше"
                                                        >
                                                            <ArrowUp size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={idx === trainingPlanDraft.length - 1}
                                                            onClick={() => handleReorderPlanDraft(idx, 'down')}
                                                            className="p-1 rounded hover:bg-white/10 disabled:opacity-20 text-zinc-400 hover:text-white"
                                                            title="Переместить ниже"
                                                        >
                                                            <ArrowDown size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFromPlanDraft(item.draftId)}
                                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors ml-1"
                                                        title="Удалить из плана"
                                                    >
                                                        <TrashIcon size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {trainingPlanDraft.length === 0 && (
                                            <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl space-y-2">
                                                <div className="text-3xl">📋</div>
                                                <div className="text-sm font-bold text-zinc-300">План тренировки пуст</div>
                                                <div className="text-xs text-zinc-500">
                                                    Нажимайте «➕ В план» на карточках упражнений в каталоге, чтобы собрать структуру занятия.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Training Settings & Target Group (5 cols) */}
                                <div className="lg:col-span-5 space-y-5 bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                            <CalendarIcon size={14} className="text-amber-400" /> Параметры занятия
                                        </h3>

                                        {/* Title Input */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                Название тренировки
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Напр: Интенсивное ведение мяча и удары..."
                                                value={planAssignmentData.title}
                                                onChange={(e) => setPlanAssignmentData({ ...planAssignmentData, title: e.target.value })}
                                                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-bold"
                                            />
                                        </div>

                                        {/* Target Group Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                Кому назначить (Группа)
                                            </label>
                                            <select
                                                value={planAssignmentData.groupId || selectedGroupId || (myGroups[0]?.id || '')}
                                                onChange={(e) => setPlanAssignmentData({ ...planAssignmentData, groupId: e.target.value })}
                                                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-bold cursor-pointer"
                                            >
                                                {myGroups.map(g => (
                                                    <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                                                        {g.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date and Time */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                    Дата
                                                </label>
                                                <input
                                                    type="date"
                                                    value={planAssignmentData.date}
                                                    onChange={(e) => setPlanAssignmentData({ ...planAssignmentData, date: e.target.value })}
                                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                    Время
                                                </label>
                                                <input
                                                    type="time"
                                                    value={planAssignmentData.time}
                                                    onChange={(e) => setPlanAssignmentData({ ...planAssignmentData, time: e.target.value })}
                                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                                                />
                                            </div>
                                        </div>

                                        {/* Intensity Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                Интенсивность
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { id: 'low', label: 'Низкая 🟢' },
                                                    { id: 'medium', label: 'Средняя 🟡' },
                                                    { id: 'high', label: 'Высокая 🔴' }
                                                ].map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setPlanAssignmentData({ ...planAssignmentData, intensity: item.id as any })}
                                                        className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                                                            planAssignmentData.intensity === item.id
                                                                ? 'bg-amber-400 text-black border-amber-400 shadow-md font-black'
                                                                : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Aggregated Equipment preview */}
                                        {trainingPlanDraft.some(item => item.equipment && item.equipment.length > 0) && (
                                            <div className="space-y-1.5 pt-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                                                    <Dumbbell size={12} className="text-amber-400" /> Весь инвентарь к занятию:
                                                </label>
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.from(new Set(trainingPlanDraft.flatMap(item => item.equipment || []))).map((eq: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-zinc-200">
                                                            {eq}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-4 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={handleSavePlanToGroup}
                                            disabled={trainingPlanDraft.length === 0}
                                            className="w-full py-3.5 rounded-2xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <SaveIcon size={16} /> Назначить тренировку группе
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleSavePlanAsTemplate}
                                            disabled={trainingPlanDraft.length === 0}
                                            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Layers size={14} className="text-purple-400" /> Сохранить как шаблон
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DRAG AND DROP TOAST NOTIFICATION */}
            <AnimatePresence>
                {dragNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="fixed top-8 left-1/2 -translate-x-1/2 z-[350] px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-russo text-xs uppercase tracking-wider shadow-[0_10px_35px_rgba(245,158,11,0.5)] flex items-center gap-2.5 pointer-events-none border border-black/10"
                    >
                        <span className="text-base">📁</span>
                        <span>{dragNotification}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachSection;
